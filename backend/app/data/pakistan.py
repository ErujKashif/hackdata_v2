"""
Pakistan locale data pool — names, cities, addresses, phone formats, PKR currency.
All data is bundled in-repo. No network calls.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Names
# ---------------------------------------------------------------------------

MALE_FIRST_NAMES: list[str] = [
    "Ahmad", "Ali", "Bilal", "Daniyal", "Faisal", "Hamza", "Ibrahim",
    "Junaid", "Kamran", "Luqman", "Muhammad", "Naveed", "Omar", "Qasim",
    "Rafay", "Saad", "Tariq", "Usman", "Waseem", "Yasir", "Zubair",
    "Adnan", "Babar", "Dawood", "Fahad", "Hassan", "Irfan", "Jawad",
    "Khalid", "Majid", "Nasir", "Obaid", "Rehan", "Shahid", "Talha",
    "Umer", "Waleed", "Asad", "Farhan", "Ghulam", "Haider", "Imran",
    "Javed", "Khurram", "Mohsin", "Noman", "Raza", "Salman", "Zain",
]

FEMALE_FIRST_NAMES: list[str] = [
    "Aisha", "Bushra", "Fatima", "Hina", "Iqra", "Javeria", "Kiran",
    "Layla", "Madiha", "Nadia", "Noor", "Rabia", "Sana", "Sobia",
    "Tasmiya", "Urooj", "Zara", "Amna", "Ayesha", "Bismah", "Durr",
    "Faiza", "Ghazala", "Hafsa", "Isma", "Mehwish", "Nimra", "Pakeeza",
    "Qurat", "Rimsha", "Saima", "Sidra", "Uzma", "Wardah", "Yasmin",
    "Zunaira", "Aliza", "Fariha", "Humaira", "Maryam", "Rida", "Shazia",
]

LAST_NAMES: list[str] = [
    "Khan", "Ahmed", "Ali", "Malik", "Chaudhry", "Siddiqui", "Qureshi",
    "Mirza", "Shah", "Butt", "Abbasi", "Ansari", "Baig", "Cheema",
    "Dar", "Farooq", "Ghazi", "Hashmi", "Iqbal", "Javed", "Kazmi",
    "Lodhi", "Mughal", "Niazi", "Paracha", "Rana", "Saeed", "Tahir",
    "Usmani", "Waqas", "Zahid", "Aslam", "Bhatti", "Chishti", "Durrani",
    "Faizi", "Gondal", "Hussain", "Ismail", "Janjua", "Khawaja", "Lakhani",
    "Memon", "Naqvi", "Rizvi", "Sheikh", "Tariq", "Waheed", "Yousuf",
]

ALL_FIRST_NAMES: list[str] = MALE_FIRST_NAMES + FEMALE_FIRST_NAMES


def full_name(rng) -> str:
    """Generate a realistic Pakistani full name."""
    first = rng.choice(ALL_FIRST_NAMES)
    last = rng.choice(LAST_NAMES)
    return f"{first} {last}"


# ---------------------------------------------------------------------------
# Geography
# ---------------------------------------------------------------------------

CITIES: list[str] = [
    "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad",
    "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala",
    "Hyderabad", "Abbottabad", "Bahawalpur", "Sargodha", "Sukkur",
    "Larkana", "Mardan", "Sheikhupura", "Rahim Yar Khan", "Gujrat",
    "Kasur", "Okara", "Chiniot", "Jhang", "Sahiwal",
    "Muzaffarabad", "Mirpur", "Kotli", "Attock", "Chakwal",
]

PROVINCES: list[str] = [
    "Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan",
    "Islamabad Capital Territory", "Azad Kashmir", "Gilgit-Baltistan",
]

STREET_PREFIXES: list[str] = [
    "Street", "Avenue", "Road", "Lane", "Boulevard", "Block",
    "Sector", "Phase", "Town", "Colony",
]

AREAS: list[str] = [
    "DHA", "Gulberg", "Johar Town", "Model Town", "Bahria Town",
    "PECHS", "Clifton", "Defence", "F-7", "G-9", "I-8", "Blue Area",
    "Saddar", "Cantt", "Gulshan-e-Iqbal", "North Nazimabad",
    "Korangi", "Landhi", "Malir", "Orangi Town",
]


def address(rng) -> str:
    """Generate a realistic Pakistani address."""
    house = rng.randint(1, 500)
    street_num = rng.randint(1, 50)
    area = rng.choice(AREAS)
    city = rng.choice(CITIES)
    return f"House {house}, Street {street_num}, {area}, {city}"


# ---------------------------------------------------------------------------
# Phone numbers
# ---------------------------------------------------------------------------

MOBILE_PREFIXES: list[str] = [
    "0300", "0301", "0302", "0303",  # Mobilink/Jazz
    "0311", "0312", "0313",          # Zong
    "0321", "0322", "0323",          # Telenor
    "0331", "0332", "0333",          # Ufone
    "0341", "0345", "0346",          # Warid/Jazz
]


def phone(rng) -> str:
    """Generate a Pakistani mobile number in +92 format."""
    prefix = rng.choice(MOBILE_PREFIXES)
    number = rng.randint(1_000_000, 9_999_999)
    # Convert 0XXX to +92-XXX format
    intl_prefix = "+92-" + prefix[1:]
    return f"{intl_prefix}-{number}"


# ---------------------------------------------------------------------------
# Companies
# ---------------------------------------------------------------------------

COMPANY_SUFFIXES: list[str] = [
    "Pvt Ltd", "Limited", "& Sons", "Enterprises", "Solutions",
    "Technologies", "Group", "Associates", "Industries", "Corp",
    "Trading", "Services", "Consultants",
]

COMPANY_PREFIXES: list[str] = [
    "Al-", "Pak", "National", "United", "Prime", "Elite", "Allied",
    "Metro", "Global", "Pioneer", "Standard", "Apex", "Pinnacle",
    "Crescent", "Star", "Diamond", "Golden", "Silver", "Royal",
]

COMPANY_NOUNS: list[str] = [
    "Tech", "Commerce", "Trade", "Finance", "Build", "Data",
    "Media", "Pharma", "Agri", "Steel", "Textile", "Logistics",
    "Energy", "Infra", "Digital", "Auto", "Healthcare",
]


def company(rng) -> str:
    """Generate a realistic Pakistani company name."""
    prefix = rng.choice(COMPANY_PREFIXES)
    noun = rng.choice(COMPANY_NOUNS)
    suffix = rng.choice(COMPANY_SUFFIXES)
    return f"{prefix}{noun} {suffix}"


# ---------------------------------------------------------------------------
# Currency (PKR)
# ---------------------------------------------------------------------------

def currency_pkr(rng, min_val: float = 100.0, max_val: float = 1_000_000.0) -> float:
    """Generate a PKR currency amount rounded to 2 decimal places."""
    return round(rng.uniform(min_val, max_val), 2)


# ---------------------------------------------------------------------------
# Email domains common in Pakistan
# ---------------------------------------------------------------------------

EMAIL_DOMAINS: list[str] = [
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
    "mail.com", "protonmail.com", "ymail.com",
]


def email(first: str, last: str, rng) -> str:
    """Generate a realistic email from a name."""
    separators = [".", "_", ""]
    sep = rng.choice(separators)
    num = "" if rng.random() > 0.4 else str(rng.randint(1, 999))
    domain = rng.choice(EMAIL_DOMAINS)
    local = f"{first.lower()}{sep}{last.lower()}{num}"
    return f"{local}@{domain}"
