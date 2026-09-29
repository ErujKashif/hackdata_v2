"""
Relational data generation engine.
Generates multiple related tables maintaining:
  - Referential integrity (FK → PK)
  - Configurable cardinalities (1:N, N:N)
  - Cross-table consistency (order totals match line items)
"""

from __future__ import annotations

import random
import uuid
from datetime import date, timedelta
from typing import Any

from app.data import pakistan as pk


# ---------------------------------------------------------------------------
# Built-in relational schemas
# ---------------------------------------------------------------------------

RELATIONAL_SCHEMAS = {
    "ecommerce": {
        "label": "E-Commerce (Customers → Orders → Items)",
        "description": "Customers table linked to Orders, each Order has 1-5 line items. Totals reconcile.",
        "tables": ["customers", "orders", "order_items"],
    },
    "hr": {
        "label": "HR (Departments → Employees → Payroll)",
        "description": "Departments with employees, each employee has a payroll record.",
        "tables": ["departments", "employees", "payroll"],
    },
    "banking": {
        "label": "Banking (Accounts → Transactions)",
        "description": "Bank accounts with transaction histories and running balances.",
        "tables": ["accounts", "transactions"],
    },
}


def _uuid(rng: random.Random) -> str:
    return str(uuid.UUID(int=rng.getrandbits(128), version=4))


def _date_str(rng: random.Random, start: str = "2023-01-01", end: str = "2025-12-31") -> str:
    s = date.fromisoformat(start)
    e = date.fromisoformat(end)
    delta = (e - s).days
    return (s + timedelta(days=rng.randint(0, delta))).isoformat()


# ---------------------------------------------------------------------------
# E-Commerce schema generator
# ---------------------------------------------------------------------------

def _gen_ecommerce(num_customers: int, seed: int, locale: str) -> dict[str, list[dict]]:
    rng = random.Random(seed)

    # -- Customers
    customers = []
    for _ in range(num_customers):
        cid = _uuid(rng)
        name = pk.full_name(rng) if locale == "pk_PK" else f"User {rng.randint(1000,9999)}"
        first = name.split()[0]
        last = name.split()[-1]
        customers.append({
            "customer_id": cid,
            "full_name": name,
            "email": pk.email(first, last, rng),
            "phone": pk.phone(rng),
            "city": rng.choice(pk.CITIES),
            "signup_date": _date_str(rng, "2021-01-01", "2025-01-01"),
            "status": rng.choices(["active", "inactive", "suspended"], weights=[0.75, 0.15, 0.10])[0],
        })

    # -- Orders (1 to 4 orders per customer)
    orders = []
    order_items = []

    for cust in customers:
        num_orders = rng.randint(1, 4)
        for _ in range(num_orders):
            oid = _uuid(rng)
            order_date = _date_str(rng, "2023-01-01", "2025-12-31")
            status = rng.choices(
                ["completed", "pending", "shipped", "cancelled"],
                weights=[0.60, 0.15, 0.20, 0.05]
            )[0]

            # Generate 1–5 line items first so order total reconciles
            num_items = rng.randint(1, 5)
            items = []
            for _ in range(num_items):
                item_id = _uuid(rng)
                sku = f"SKU-{rng.randint(10000, 99999)}"
                qty = rng.randint(1, 10)
                unit_price = round(rng.uniform(100, 15000), 2)
                amount = round(qty * unit_price, 2)
                items.append({
                    "item_id": item_id,
                    "order_id": oid,
                    "sku": sku,
                    "product_name": rng.choice([
                        "Laptop", "Phone", "Tablet", "Headphones", "Mouse", "Keyboard",
                        "Monitor", "Charger", "Cable", "Case", "Speaker", "Webcam"
                    ]),
                    "qty": qty,
                    "unit_price_pkr": unit_price,
                    "amount_pkr": amount,
                })

            # Compute order total from items (referential consistency)
            subtotal = round(sum(i["amount_pkr"] for i in items), 2)
            tax = round(subtotal * 0.17, 2)
            order_total = round(subtotal + tax, 2)

            orders.append({
                "order_id": oid,
                "customer_id": cust["customer_id"],  # FK
                "order_date": order_date,
                "status": status,
                "item_count": num_items,
                "subtotal_pkr": subtotal,
                "tax_pkr": tax,
                "total_pkr": order_total,
            })
            order_items.extend(items)

    return {
        "customers": customers,
        "orders": orders,
        "order_items": order_items,
    }


# ---------------------------------------------------------------------------
# HR schema generator
# ---------------------------------------------------------------------------

DEPARTMENTS = ["Engineering", "Finance", "HR", "Sales", "Operations", "Marketing", "Legal"]

def _gen_hr(num_employees: int, seed: int, locale: str) -> dict[str, list[dict]]:
    rng = random.Random(seed)

    # -- Departments
    departments = []
    for dept_name in DEPARTMENTS:
        departments.append({
            "department_id": _uuid(rng),
            "name": dept_name,
            "head_count_budget": rng.randint(5, 50),
            "annual_budget_pkr": round(rng.uniform(5_000_000, 50_000_000), 2),
        })
    dept_map = {d["name"]: d["department_id"] for d in departments}

    # -- Employees
    employees = []
    payroll = []
    for _ in range(num_employees):
        eid = _uuid(rng)
        name = pk.full_name(rng) if locale == "pk_PK" else f"Employee {rng.randint(100,999)}"
        first = name.split()[0]
        last = name.split()[-1]
        dept_name = rng.choices(
            DEPARTMENTS,
            weights=[0.30, 0.12, 0.08, 0.20, 0.15, 0.10, 0.05]
        )[0]
        hire_date = _date_str(rng, "2015-01-01", "2025-01-01")
        salary = round(rng.uniform(40_000, 500_000), 2)
        grade = rng.choice(["L1", "L2", "L3", "L4", "L5"])

        employees.append({
            "employee_id": eid,
            "full_name": name,
            "email": pk.email(first, last, rng),
            "department_id": dept_map[dept_name],  # FK
            "department": dept_name,
            "hire_date": hire_date,
            "job_grade": grade,
            "is_active": rng.random() > 0.08,
            "rating": rng.choices(
                ["Excellent", "Good", "Satisfactory", "Needs Improvement"],
                weights=[0.20, 0.45, 0.25, 0.10]
            )[0],
        })

        # Payroll record for each employee
        payroll.append({
            "payroll_id": _uuid(rng),
            "employee_id": eid,  # FK
            "month": rng.randint(1, 12),
            "year": rng.randint(2024, 2025),
            "basic_salary_pkr": salary,
            "allowances_pkr": round(salary * rng.uniform(0.1, 0.3), 2),
            "deductions_pkr": round(salary * rng.uniform(0.05, 0.12), 2),
            "net_salary_pkr": round(
                salary + salary * rng.uniform(0.1, 0.3) - salary * rng.uniform(0.05, 0.12), 2
            ),
        })

    return {
        "departments": departments,
        "employees": employees,
        "payroll": payroll,
    }


# ---------------------------------------------------------------------------
# Banking schema generator
# ---------------------------------------------------------------------------

MERCHANTS = [
    "Carrefour", "Metro Cash & Carry", "Daraz.pk", "Foodpanda", "KFC Pakistan",
    "MCB Bank ATM", "HBL Branch", "PTCL Bill", "K-Electric", "Sui Gas SSGC",
    "Uber Pakistan", "Bolt Rides", "Al-Fatah Stores", "Naheed Super Market",
    "Pharmacy Plus", "Agha's Superstore", "Salary Credit", "Freelance Income",
    "Amazon Refund", "Netflix PK", "Spotify", "PEMRA Fee",
]

def _gen_banking(num_accounts: int, seed: int, locale: str) -> dict[str, list[dict]]:
    rng = random.Random(seed)

    accounts = []
    transactions = []

    for _ in range(num_accounts):
        aid = _uuid(rng)
        name = pk.full_name(rng) if locale == "pk_PK" else f"Account Holder {rng.randint(100,999)}"
        iban = pk.MOBILE_PREFIXES  # reuse rng for IBAN
        account_iban = (
            f"PK{rng.randint(10,99)}"
            f"{rng.choice(['HABB','MCBL','UBLP','BAHL','MEZN'])}"
            f"{''.join(str(rng.randint(0,9)) for _ in range(16))}"
        )
        opening_balance = round(rng.uniform(5000, 500_000), 2)

        accounts.append({
            "account_id": aid,
            "account_holder": name,
            "iban": account_iban,
            "account_type": rng.choice(["Savings", "Current", "Business"]),
            "opening_balance_pkr": opening_balance,
            "currency": "PKR",
        })

        # Generate 10-30 transactions; running balance must be consistent
        num_txns = rng.randint(10, 30)
        balance = opening_balance
        txn_date = date.fromisoformat("2025-01-01")

        for _ in range(num_txns):
            txn_id = _uuid(rng)
            # Advance date by 0-5 days
            txn_date = txn_date + timedelta(days=rng.randint(0, 5))
            if txn_date > date(2025, 12, 31):
                break

            merchant = rng.choice(MERCHANTS)
            is_credit = "Salary" in merchant or "Income" in merchant or "Refund" in merchant
            txn_type = "credit" if is_credit else rng.choices(
                ["debit", "transfer"], weights=[0.75, 0.25]
            )[0]

            if txn_type == "credit":
                amount = round(rng.uniform(1000, 200_000), 2)
                balance = round(balance + amount, 2)
                debit, credit = None, amount
            else:
                # Don't let balance go negative
                max_debit = min(balance * 0.4, 50_000)
                if max_debit < 10:
                    continue
                amount = round(rng.uniform(10, max_debit), 2)
                balance = round(balance - amount, 2)
                debit, credit = amount, None

            transactions.append({
                "txn_id": txn_id,
                "account_id": aid,          # FK
                "date": txn_date.isoformat(),
                "description": merchant,
                "txn_type": txn_type,
                "debit_pkr": debit,
                "credit_pkr": credit,
                "balance_pkr": balance,     # running balance — always consistent
                "status": rng.choices(["completed", "pending", "failed"], weights=[0.92, 0.06, 0.02])[0],
            })

    return {
        "accounts": accounts,
        "transactions": transactions,
    }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def generate_relational(schema_id: str, row_count: int, seed: int, locale: str) -> dict[str, Any]:
    """
    Generate a complete multi-table relational dataset.
    Returns a dict of table_name → list[row_dict].
    """
    if schema_id == "ecommerce":
        tables = _gen_ecommerce(max(5, min(row_count, 200)), seed, locale)
    elif schema_id == "hr":
        tables = _gen_hr(max(5, min(row_count, 500)), seed, locale)
    elif schema_id == "banking":
        tables = _gen_banking(max(2, min(row_count, 100)), seed, locale)
    else:
        raise ValueError(f"Unknown schema_id '{schema_id}'. Valid: ecommerce, hr, banking")

    summary = {
        name: {"row_count": len(rows), "columns": list(rows[0].keys()) if rows else []}
        for name, rows in tables.items()
    }

    return {
        "schema_id": schema_id,
        "seed": seed,
        "locale": locale,
        "tables": tables,
        "summary": summary,
    }
