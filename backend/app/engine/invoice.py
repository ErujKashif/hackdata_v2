"""
Invoice generation engine.
- Generates realistic invoice documents with reconciling totals.
- Outputs both structured data and HTML document.
- Seeded for reproducibility.
- No external API calls.
"""

from __future__ import annotations

import random
from datetime import date, timedelta
from typing import Optional

from jinja2 import Environment, BaseLoader

from app.models.schemas import InvoiceRequest, InvoiceResponse, InvoiceLineItem


# ---------------------------------------------------------------------------
# Invoice number generation
# ---------------------------------------------------------------------------

def _invoice_number(rng: random.Random, seed: int) -> str:
    prefix = "INV"
    number = rng.randint(10000, 99999)
    return f"{prefix}-{number}"


# ---------------------------------------------------------------------------
# HTML template
# ---------------------------------------------------------------------------

INVOICE_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Invoice {{ invoice_number }}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #f5f0e8;
    padding: 40px;
    color: #1a1a2e;
  }
  .invoice-wrap {
    max-width: 760px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.10);
  }
  .invoice-header {
    background: #0d1b2a;
    color: #f5f0e8;
    padding: 36px 40px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .invoice-header .company { font-size: 22px; font-weight: 700; }
  .invoice-header .meta { text-align: right; }
  .invoice-header .meta .inv-number { font-size: 18px; font-weight: 600; color: #2a9d8f; }
  .invoice-header .meta .inv-date { font-size: 13px; margin-top: 4px; opacity: 0.7; }
  .invoice-body { padding: 40px; }
  .bill-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: 36px;
  }
  .bill-section .block { flex: 1; }
  .bill-section .block:last-child { text-align: right; }
  .bill-section .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6b7280;
    margin-bottom: 6px;
  }
  .bill-section .value { font-size: 16px; font-weight: 600; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 32px;
  }
  thead th {
    background: #0d1b2a;
    color: #f5f0e8;
    padding: 12px 16px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: left;
  }
  thead th:last-child { text-align: right; }
  tbody td {
    padding: 14px 16px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 14px;
  }
  tbody td:last-child { text-align: right; }
  tbody tr:last-child td { border-bottom: none; }
  .totals {
    display: flex;
    justify-content: flex-end;
  }
  .totals-table {
    width: 280px;
    border-collapse: collapse;
  }
  .totals-table td {
    padding: 8px 0;
    font-size: 14px;
  }
  .totals-table td:last-child { text-align: right; font-weight: 500; }
  .totals-table .total-row td {
    border-top: 2px solid #0d1b2a;
    padding-top: 12px;
    font-size: 16px;
    font-weight: 700;
    color: #0d1b2a;
  }
  .totals-table .tax-row td { color: #6b7280; }
  .invoice-footer {
    background: #f5f0e8;
    padding: 20px 40px;
    text-align: center;
    font-size: 12px;
    color: #6b7280;
    border-top: 1px solid #e5e7eb;
  }
  .badge {
    display: inline-block;
    background: #2a9d8f;
    color: white;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: 8px;
  }
</style>
</head>
<body>
<div class="invoice-wrap">
  <div class="invoice-header">
    <div>
      <div class="company">{{ company_name }}</div>
      <div style="margin-top:8px; font-size:13px; opacity:0.7;">Synthetic Data Co.</div>
    </div>
    <div class="meta">
      <div class="inv-number">{{ invoice_number }}</div>
      <div class="inv-date">Issued: {{ issue_date }}</div>
      <div class="badge">{{ currency }}</div>
    </div>
  </div>

  <div class="invoice-body">
    <div class="bill-section">
      <div class="block">
        <div class="label">From</div>
        <div class="value">{{ company_name }}</div>
      </div>
      <div class="block">
        <div class="label">Billed To</div>
        <div class="value">{{ client_name }}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {% for item in line_items %}
        <tr>
          <td>{{ item.description }}</td>
          <td style="text-align:center">{{ item.qty }}</td>
          <td style="text-align:right">{{ currency }} {{ "%.2f"|format(item.price) }}</td>
          <td>{{ currency }} {{ "%.2f"|format(item.amount) }}</td>
        </tr>
        {% endfor %}
      </tbody>
    </table>

    <div class="totals">
      <table class="totals-table">
        <tr>
          <td>Subtotal</td>
          <td>{{ currency }} {{ "%.2f"|format(subtotal) }}</td>
        </tr>
        <tr class="tax-row">
          <td>Tax ({{ "%.0f"|format(tax_rate * 100) }}%)</td>
          <td>{{ currency }} {{ "%.2f"|format(tax_amount) }}</td>
        </tr>
        <tr class="total-row">
          <td>Total Due</td>
          <td>{{ currency }} {{ "%.2f"|format(total) }}</td>
        </tr>
      </table>
    </div>
  </div>

  <div class="invoice-footer">
    Generated by Synthara &mdash; Synthetic Data Platform &mdash; {{ issue_date }}<br/>
    This is a synthetic document. All values are computer-generated.
  </div>
</div>
</body>
</html>
"""


def generate_invoice(req: InvoiceRequest) -> InvoiceResponse:
    """
    Generate a complete invoice with reconciling totals.
    Returns structured data + rendered HTML document.
    """
    seed = req.seed if req.seed is not None else 42
    rng = random.Random(seed)

    # Invoice metadata
    inv_number = _invoice_number(rng, seed)
    issue_date = date.today().isoformat()

    # Calculate line items
    items: list[InvoiceLineItem] = []
    for item in req.line_items:
        amount = round(item.qty * item.price, 2)
        items.append(InvoiceLineItem(
            description=item.description,
            qty=item.qty,
            price=item.price,
            amount=amount,
        ))

    # Totals — always reconcile
    subtotal = round(sum(i.amount for i in items), 2)
    tax_amount = round(subtotal * req.tax_rate, 2)
    total = round(subtotal + tax_amount, 2)

    # Render HTML
    env = Environment(loader=BaseLoader())
    template = env.from_string(INVOICE_HTML_TEMPLATE)
    document_html = template.render(
        invoice_number=inv_number,
        issue_date=issue_date,
        company_name=req.company_name,
        client_name=req.client_name,
        line_items=items,
        subtotal=subtotal,
        tax_rate=req.tax_rate,
        tax_amount=tax_amount,
        total=total,
        currency=req.currency,
    )

    return InvoiceResponse(
        invoice_number=inv_number,
        issue_date=issue_date,
        company_name=req.company_name,
        client_name=req.client_name,
        line_items=items,
        subtotal=subtotal,
        tax_rate=req.tax_rate,
        tax_amount=tax_amount,
        total=total,
        currency=req.currency,
        document_html=document_html,
    )
