import os
import sqlite3
from datetime import datetime, timedelta
import database

def seed_database():
    print("Seeding database with realistic student/young professional expenses...")
    
    # Initialize DB (creates file and schema if not present)
    database.init_db()
    
    # Check if database already has records
    existing = database.get_expenses()
    if len(existing) > 0:
        print("Database already contains records. Skipping seeding.")
        return
        
    # Sample transactions
    # Let's generate dates dynamically relative to current date (June 6, 2026)
    today = datetime(2026, 6, 6)
    
    expenses_data = [
        ("Starbucks Specialty Coffee", 6.25, "Food", today - timedelta(days=15)),
        ("College Semester Textbooks", 112.50, "Education", today - timedelta(days=14)),
        ("Weekly Groceries (Trader Joe's)", 58.40, "Food", today - timedelta(days=13)),
        ("Subway Metro Card Refill", 20.00, "Travel", today - timedelta(days=12)),
        ("Netflix Monthly Subscription", 15.49, "Entertainment", today - timedelta(days=11)),
        ("Impulse Clothes Shopping (H&M)", 45.99, "Shopping", today - timedelta(days=10)),
        ("Late Night Pizza Slice", 4.50, "Food", today - timedelta(days=9)),
        ("Gym Monthly Membership", 30.00, "Other", today - timedelta(days=8)),
        ("Coursera Course Subscription", 49.00, "Education", today - timedelta(days=7)),
        ("Chipotle Bowl & Guac", 13.75, "Food", today - timedelta(days=6)),
        ("Uber Commute in Rain", 18.50, "Travel", today - timedelta(days=5)),
        ("Concert Ticket with Friends", 65.00, "Entertainment", today - timedelta(days=4)),
        ("Weekly Groceries (Kroger)", 62.10, "Food", today - timedelta(days=3)),
        ("New Running Shoes", 85.00, "Shopping", today - timedelta(days=2)),
        ("MacBook Screen Cleaner Spray", 12.99, "Other", today - timedelta(days=1)),
        ("Boba Tea Treat", 7.50, "Food", today),
    ]
    
    for title, amount, category, date in expenses_data:
        date_str = date.strftime('%Y-%m-%d')
        database.add_expense(title, amount, category, date_str)
        
    print(f"Successfully seeded {len(expenses_data)} expense records into the database.")

if __name__ == '__main__':
    seed_database()
