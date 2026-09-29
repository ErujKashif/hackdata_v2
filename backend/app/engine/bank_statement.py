"""
Bank Statement generator.
Produces a realistic HTML bank statement with:
  - Running balance (never goes negative)
  - Realistic Pakistani merchant descriptions
  - Proper debit/credit formatting
  - Print-ready HTML layout
"""

from __future__ import annotations

import random
import calendar
from datetime import date, timedelta
from typing import Any

from app.data import pakistan as pk


MERCHANTS_DEBIT = [
    ("Carrefour Superstore", "Shopping"),
    ("Daraz.pk – Online Order", "Shopping"),
    ("KFC Pakistan", "Food & Dining"),
    ("Foodpanda Order", "Food & Dining"),
    ("Uber Pakistan", "Transport"),
    ("Bolt Rides", "Transport"),
    ("Mobilink Jazz Bill", "Utilities"),
    ("K-Electric Bill Payment", "Utilities"),
    ("Sui Gas SSGC", "Utilities"),
    ("PTCL Broadband", "Utilities"),
    ("Al-Fatah Stores", "Grocery"),
    ("Naheed Super Market", "Grocery"),
    ("Metro Cash & Carry", "Grocery"),
    ("Pharmacy Plus PK", "Health"),
    ("Netflix PK", "Entertainment"),
    ("Spotify Premium", "Entertainment"),
    ("ATM Withdrawal – MCB", "Cash"),
    ("ATM Withdrawal – HBL", "Cash"),
    ("Online Transfer – IBFT", "Transfer"),
    ("Amazon Web Services", "Tech"),
]

MERCHANTS_CREDIT = [
    ("Salary Credit – {company}", "Salary"),
    ("Freelance Payment – Upwork", "Income"),
    ("Bank Profit Quarterly", "Interest"),
    ("Online Transfer – Received", "Transfer"),
    ("Refund – Daraz.pk", "Refund"),
]


def _build_html(
    *,
    account_holder: str,
    account_number: str,
    bank_name: str,
    iban: str,
    opening_balance: float,
    closing_balance: float,
    currency: str,
    month: int,
    year: int,
    transactions: list[dict],
    total_credits: float,
    total_debits: float,
) -> str:
    month_name = calendar.month_name[month]

    def fmt(v: float | None) -> str:
        if v is None:
            return "–"
        return f"{currency} {v:,.2f}"

    rows_html = ""
    for txn in transactions:
        debit_str = fmt(txn["debit"])
        credit_str = fmt(txn["credit"])
        balance_str = fmt(txn["balance"])
        txn_type_class = "credit" if txn["credit"] else "debit"
        rows_html += f"""
        <tr>
          <td>{txn['date']}</td>
          <td>{txn['description']}</td>
          <td>{txn['category']}</td>
          <td class="amount debit-amt">{debit_str if txn['debit'] else ''}</td>
          <td class="amount credit-amt">{credit_str if txn['credit'] else ''}</td>
          <td class="amount balance-amt">{balance_str}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Bank Statement – {month_name} {year}</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      color: #1a1a2e;
      background: #fff;
      padding: 32px;
    }}

    /* Header */
    .stmt-header {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #0f3460;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }}
    .bank-logo {{
      font-size: 22px;
      font-weight: 900;
      color: #0f3460;
      letter-spacing: -0.5px;
    }}
    .bank-logo span {{ color: #16213e; font-weight: 400; font-size: 12px; display: block; margin-top: 2px; }}
    .stmt-title {{
      text-align: right;
    }}
    .stmt-title h1 {{
      font-size: 18px;
      font-weight: 700;
      color: #0f3460;
    }}
    .stmt-title p {{ color: #555; font-size: 11px; margin-top: 3px; }}

    /* Account info grid */
    .account-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }}
    .info-box {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
    }}
    .info-box label {{
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      display: block;
      margin-bottom: 3px;
    }}
    .info-box .val {{
      font-size: 13px;
      font-weight: 700;
      color: #0f3460;
    }}

    /* Summary band */
    .summary-band {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 20px;
    }}
    .summary-card {{
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }}
    .summary-card.open  {{ background: #eff6ff; border: 1px solid #bfdbfe; }}
    .summary-card.cred  {{ background: #f0fdf4; border: 1px solid #bbf7d0; }}
    .summary-card.deb   {{ background: #fff7ed; border: 1px solid #fed7aa; }}
    .summary-card.close {{ background: #0f3460; }}
    .summary-card label {{
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      display: block;
      margin-bottom: 4px;
    }}
    .summary-card.open label   {{ color: #3b82f6; }}
    .summary-card.cred label   {{ color: #16a34a; }}
    .summary-card.deb label    {{ color: #ea580c; }}
    .summary-card.close label  {{ color: #93c5fd; }}
    .summary-card .amt {{
      font-size: 14px;
      font-weight: 800;
    }}
    .summary-card.open .amt   {{ color: #1d4ed8; }}
    .summary-card.cred .amt   {{ color: #15803d; }}
    .summary-card.deb .amt    {{ color: #c2410c; }}
    .summary-card.close .amt  {{ color: #ffffff; }}

    /* Table */
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }}
    thead tr {{
      background: #0f3460;
      color: white;
    }}
    thead th {{
      padding: 9px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    tbody tr:nth-child(even) {{ background: #f8fafc; }}
    tbody tr:hover {{ background: #eff6ff; }}
    tbody td {{
      padding: 7px 10px;
      border-bottom: 1px solid #e8edf2;
      color: #374151;
    }}
    .amount {{ text-align: right; font-family: 'Courier New', monospace; font-weight: 600; }}
    .debit-amt  {{ color: #dc2626; }}
    .credit-amt {{ color: #16a34a; }}
    .balance-amt {{ color: #0f3460; font-weight: 700; }}

    /* Footer */
    .stmt-footer {{
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      color: #94a3b8;
      font-size: 9px;
    }}
    .disclaimer {{
      margin-top: 12px;
      padding: 10px;
      background: #fefce8;
      border: 1px solid #fde68a;
      border-radius: 4px;
      font-size: 9px;
      color: #92400e;
    }}

    @media print {{
      body {{ padding: 16px; }}
      thead {{ display: table-header-group; }}
    }}
  </style>
</head>
<body>

<div class="stmt-header">
  <div class="bank-logo">
    {bank_name}
    <span>Member of Deposit Protection Corporation · IBFT Enabled</span>
  </div>
  <div class="stmt-title">
    <h1>Account Statement</h1>
    <p>Period: 01 {month_name} {year} – {calendar.monthrange(year, month)[1]} {month_name} {year}</p>
    <p>Generated: {date.today().isoformat()} (Synthetic – for testing only)</p>
  </div>
</div>

<div class="account-grid">
  <div class="info-box">
    <label>Account Holder</label>
    <div class="val">{account_holder}</div>
  </div>
  <div class="info-box">
    <label>Account Number</label>
    <div class="val">{account_number}</div>
  </div>
  <div class="info-box">
    <label>IBAN</label>
    <div class="val" style="font-size:11px;">{iban}</div>
  </div>
  <div class="info-box">
    <label>Currency</label>
    <div class="val">{currency}</div>
  </div>
</div>

<div class="summary-band">
  <div class="summary-card open">
    <label>Opening Balance</label>
    <div class="amt">{currency} {opening_balance:,.2f}</div>
  </div>
  <div class="summary-card cred">
    <label>Total Credits</label>
    <div class="amt">{currency} {total_credits:,.2f}</div>
  </div>
  <div class="summary-card deb">
    <label>Total Debits</label>
    <div class="amt">{currency} {total_debits:,.2f}</div>
  </div>
  <div class="summary-card close">
    <label>Closing Balance</label>
    <div class="amt">{currency} {closing_balance:,.2f}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Description</th>
      <th>Category</th>
      <th style="text-align:right">Debit</th>
      <th style="text-align:right">Credit</th>
      <th style="text-align:right">Balance</th>
    </tr>
  </thead>
  <tbody>
    {rows_html}
  </tbody>
</table>

<div class="disclaimer">
  ⚠ SYNTHETIC DATA — This statement was generated by Synthara for testing and development purposes only.
  It does not represent any real financial transaction, account, or entity.
  Not valid for any legal, financial, or regulatory purpose.
</div>

<div class="stmt-footer">
  <span>{bank_name} · Head Office: I.I. Chundrigar Road, Karachi</span>
  <span>Synthara Synthetic Data Platform · synthara.io</span>
</div>

</body>
</html>"""


def generate_bank_statement(
    account_holder: str = "",
    account_number: str = "",
    bank_name: str = "HBL – Habib Bank Limited",
    num_transactions: int = 20,
    opening_balance: float = 50_000.0,
    currency: str = "PKR",
    month: int = 9,
    year: int = 2025,
    locale: str = "pk_PK",
    seed: int = 42,
) -> dict[str, Any]:
    rng = random.Random(seed)

    # Auto-generate account holder if not provided
    if not account_holder:
        account_holder = pk.full_name(rng)

    # Auto-generate account number if not provided
    if not account_number:
        bank_codes = {"HBL": "HABB", "MCB": "MCBL", "UBL": "UBLP", "Bank Alfalah": "BAHL"}
        code = next((v for k, v in bank_codes.items() if k in bank_name), "HABB")
        account_number = f"{''.join(str(rng.randint(0,9)) for _ in range(13))}"

    # Build IBAN
    code = next((v for k, v in {"HBL": "HABB", "MCB": "MCBL", "UBL": "UBLP", "Bank Alfalah": "BAHL"}.items()
                 if k in bank_name), "HABB")
    iban = f"PK{rng.randint(10,99)}{code}{''.join(str(rng.randint(0,9)) for _ in range(16))}"

    # Get days in month
    days_in_month = calendar.monthrange(year, month)[1]
    company = pk.company(rng)

    # Generate transactions
    transactions = []
    balance = opening_balance
    total_credits = 0.0
    total_debits = 0.0

    # Sort by random days within month
    days_used = sorted(rng.sample(range(1, days_in_month + 1), min(num_transactions, days_in_month)))
    if len(days_used) < num_transactions:
        # Allow multiple per day
        extra = [rng.randint(1, days_in_month) for _ in range(num_transactions - len(days_used))]
        days_used = sorted(days_used + extra)

    for day in days_used[:num_transactions]:
        txn_date = date(year, month, day).isoformat()

        # Decide credit or debit (roughly 25% credit)
        is_credit = rng.random() < 0.25

        if is_credit:
            desc_template, category = rng.choice(MERCHANTS_CREDIT)
            description = desc_template.format(company=company)
            amount = round(rng.uniform(10_000, 150_000), 2)
            balance = round(balance + amount, 2)
            total_credits += amount
            transactions.append({
                "date": txn_date,
                "description": description,
                "category": category,
                "debit": None,
                "credit": amount,
                "balance": balance,
            })
        else:
            description, category = rng.choice(MERCHANTS_DEBIT)
            max_debit = min(balance * 0.3, 25_000)
            if max_debit < 50:
                continue
            amount = round(rng.uniform(50, max_debit), 2)
            balance = round(balance - amount, 2)
            total_debits += amount
            transactions.append({
                "date": txn_date,
                "description": description,
                "category": category,
                "debit": amount,
                "credit": None,
                "balance": balance,
            })

    html = _build_html(
        account_holder=account_holder,
        account_number=account_number,
        bank_name=bank_name,
        iban=iban,
        opening_balance=opening_balance,
        closing_balance=balance,
        currency=currency,
        month=month,
        year=year,
        transactions=transactions,
        total_credits=round(total_credits, 2),
        total_debits=round(total_debits, 2),
    )

    return {
        "account_holder": account_holder,
        "account_number": account_number,
        "iban": iban,
        "bank_name": bank_name,
        "currency": currency,
        "month": month,
        "year": year,
        "opening_balance": opening_balance,
        "closing_balance": round(balance, 2),
        "total_credits": round(total_credits, 2),
        "total_debits": round(total_debits, 2),
        "transaction_count": len(transactions),
        "transactions": transactions,
        "document_html": html,
        "seed": seed,
    }
