import unittest
import json
import os
import sqlite3
import database
import app

class ExpenseTrackerTestCase(unittest.TestCase):
    def setUp(self):
        # Configure application for testing
        app.app.config['TESTING'] = True
        self.app = app.app.test_client()
        
        # Override database configuration for testing
        self.test_db_path = os.path.join(os.path.dirname(__file__), 'test_expenses.db')
        database.DATABASE_PATH = self.test_db_path
        
        # Initialize test database
        if os.path.exists(self.test_db_path):
            os.remove(self.test_db_path)
        database.init_db()

    def tearDown(self):
        # Clean up database file after test suite finishes
        if os.path.exists(self.test_db_path):
            try:
                os.remove(self.test_db_path)
            except OSError:
                pass

    def test_add_expense_valid(self):
        """Test adding a valid expense transaction."""
        payload = {
            "title": "Chipotle Lunch",
            "amount": 14.50,
            "category": "Food",
            "date_created": "2026-06-05"
        }
        response = self.app.post('/api/expenses', 
                                 data=json.dumps(payload),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['title'], "Chipotle Lunch")
        self.assertEqual(data['amount'], 14.50)
        self.assertEqual(data['category'], "Food")
        self.assertEqual(data['date_created'], "2026-06-05")
        self.assertIn('id', data)

    def test_add_expense_invalid(self):
        """Test parameter validation rules on adding expense."""
        # 1. Invalid category
        payload = {
            "title": "Starbucks Coffee",
            "amount": 5.50,
            "category": "Luxury", # Invalid category
            "date_created": "2026-06-05"
        }
        response = self.app.post('/api/expenses', 
                                 data=json.dumps(payload),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertTrue(any("Invalid category" in err for err in data['errors']))

        # 2. Negative amount
        payload = {
            "title": "Book refund",
            "amount": -10.00, # Invalid negative amount
            "category": "Education",
            "date_created": "2026-06-05"
        }
        response = self.app.post('/api/expenses', 
                                 data=json.dumps(payload),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertTrue(any("Amount must be a positive number" in err for err in data['errors']))

    def test_get_expenses_list_and_filters(self):
        """Test retrieving list of expenses and query filter parameters."""
        # Insert test records
        database.add_expense("Target Groceries", 45.00, "Food", "2026-06-01")
        database.add_expense("Subway Ride", 2.75, "Travel", "2026-06-02")
        database.add_expense("Math Textbook", 85.00, "Education", "2026-06-03")

        # 1. Get all
        response = self.app.get('/api/expenses')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 3)

        # 2. Filter by search term
        response = self.app.get('/api/expenses?search=Textbook')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], "Math Textbook")

        # 3. Filter by category
        response = self.app.get('/api/expenses?category=Food')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], "Target Groceries")

    def test_update_expense(self):
        """Test updating an existing expense item."""
        expense_id = database.add_expense("Netflix Subscription", 15.49, "Entertainment", "2026-06-01")
        
        payload = {
            "title": "Netflix Premium Plan",
            "amount": 22.99,
            "category": "Entertainment",
            "date_created": "2026-06-02"
        }
        response = self.app.put(f'/api/expenses/{expense_id}',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['title'], "Netflix Premium Plan")
        self.assertEqual(data['amount'], 22.99)
        self.assertEqual(data['date_created'], "2026-06-02")

    def test_delete_expense(self):
        """Test deleting an expense item by ID."""
        expense_id = database.add_expense("Spotify Student Pack", 5.99, "Entertainment", "2026-06-01")
        
        response = self.app.delete(f'/api/expenses/{expense_id}')
        self.assertEqual(response.status_code, 200)
        
        # Verify it was removed
        self.assertIsNone(database.get_expense(expense_id))

    def test_dashboard_aggregation(self):
        """Test dashboard summary endpoint aggregates numbers correctly."""
        database.add_expense("Item A", 10.00, "Food", "2026-06-01")
        database.add_expense("Item B", 20.00, "Food", "2026-06-02")
        database.add_expense("Item C", 30.00, "Travel", "2026-06-03")

        response = self.app.get('/api/dashboard')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        self.assertEqual(data['total_expenses'], 60.00)
        self.assertEqual(data['category_totals']['Food'], 30.00)
        self.assertEqual(data['category_totals']['Travel'], 30.00)
        self.assertEqual(data['category_totals']['Shopping'], 0.0)
        self.assertEqual(len(data['recent_transactions']), 3)

    def test_ai_insights_generation(self):
        """Test that AI spending insights return formatted rules items."""
        # Seeding high shopping costs to trigger Wants > Needs alert
        database.add_expense("Necessity Food", 10.00, "Food", "2026-06-01")
        database.add_expense("Luxury Shopping", 90.00, "Shopping", "2026-06-02")

        response = self.app.get('/api/insights')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        self.assertTrue(len(data) > 0)
        # Verify schema
        first_insight = data[0]
        self.assertIn('type', first_insight)
        self.assertIn('category', first_insight)
        self.assertIn('title', first_insight)
        self.assertIn('description', first_insight)
        
        # Verify the top category alert triggered correctly
        self.assertTrue(any("Highest Spending in Shopping" in ins['title'] for ins in data))
        # Verify the Wants Exceeding Needs alert triggered correctly
        self.assertTrue(any("Discretionary Spend Alert" in ins['title'] for ins in data))

    def test_csv_export(self):
        """Test exporting expenses records to CSV formatted streaming body."""
        database.add_expense("Starbucks", 5.50, "Food", "2026-06-01")
        
        response = self.app.get('/api/expenses/export')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'text/csv')
        self.assertIn('attachment; filename=expenses_export.csv', response.headers.get('Content-Disposition', ''))
        
        csv_body = response.data.decode('utf-8')
        self.assertIn('ID,Title,Amount,Category,Date Created', csv_body)
        self.assertIn('Starbucks,5.5,Food,2026-06-01', csv_body)

if __name__ == '__main__':
    unittest.main()
