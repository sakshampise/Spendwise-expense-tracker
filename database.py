import sqlite3
import os

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'expenses.db')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'schema.sql')

def get_db_connection():
    """Returns a new SQLite database connection with row factory set to sqlite3.Row."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the SQLite database with the schema if it doesn't exist."""
    conn = get_db_connection()
    try:
        with open(SCHEMA_PATH, 'r') as f:
            conn.executescript(f.read())
        
        # Seed default settings
        conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('budget', '15000.0')")
        conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('savings_target', '5000.0')")
        conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('current_savings', '0.0')")
        
        conn.commit()
    finally:
        conn.close()

def get_setting(key, default=None):
    """Retrieves a configuration setting by key."""
    conn = get_db_connection()
    try:
        row = conn.execute('SELECT value FROM settings WHERE key = ?', (key,)).fetchone()
        if row:
            return row['value']
        return default
    finally:
        conn.close()

def set_setting(key, value):
    """Sets or updates a configuration setting."""
    conn = get_db_connection()
    try:
        conn.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', (key, str(value)))
        conn.commit()
    finally:
        conn.close()

def add_expense(title, amount, category, date_created):
    """Inserts a new expense into the database and returns its ID."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO expenses (title, amount, category, date_created) VALUES (?, ?, ?, ?)',
            (title, float(amount), category, date_created)
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()

def update_expense(expense_id, title, amount, category, date_created):
    """Updates an existing expense and returns True if successful."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE expenses SET title = ?, amount = ?, category = ?, date_created = ? WHERE id = ?',
            (title, float(amount), category, date_created, int(expense_id))
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()

def delete_expense(expense_id):
    """Deletes an expense by ID and returns True if successful."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM expenses WHERE id = ?', (int(expense_id),))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()

def get_expense(expense_id):
    """Retrieves a single expense by ID."""
    conn = get_db_connection()
    try:
        row = conn.execute('SELECT * FROM expenses WHERE id = ?', (int(expense_id),)).fetchone()
        if row:
            return dict(row)
        return None
    finally:
        conn.close()

def get_expenses(search=None, category=None, sort_by='date', sort_order='desc'):
    """Retrieves a filtered and sorted list of expenses."""
    query = 'SELECT * FROM expenses WHERE 1=1'
    params = []
    
    if search:
        query += ' AND title LIKE ?'
        params.append(f'%{search}%')
        
    if category:
        query += ' AND category = ?'
        params.append(category)
        
    # Validate sort column
    if sort_by == 'amount':
        order_col = 'amount'
    else:
        order_col = 'date_created'
        
    # Validate sort order direction
    if sort_order.lower() == 'asc':
        order_dir = 'ASC'
    else:
        order_dir = 'DESC'
        
    query += f' ORDER BY {order_col} {order_dir}, id DESC'
    
    conn = get_db_connection()
    try:
        rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def get_dashboard_summary():
    """Aggregates summary statistics for the dashboard UI including settings."""
    conn = get_db_connection()
    try:
        # Total overall expenses
        total_row = conn.execute('SELECT SUM(amount) as total FROM expenses').fetchone()
        total = total_row['total'] if total_row['total'] is not None else 0.0
        
        # Category totals
        category_rows = conn.execute(
            'SELECT category, SUM(amount) as total FROM expenses GROUP BY category'
        ).fetchall()
        category_totals = {row['category']: row['total'] for row in category_rows}
        
        # Ensure all default Indian Student Categories are represented
        all_categories = ["Food", "Travel", "Education", "Shopping", "Entertainment", "College Expenses", "Hostel", "Other"]
        for cat in all_categories:
            if cat not in category_totals:
                category_totals[cat] = 0.0
                
        # Monthly spending (grouped by month YYYY-MM)
        # SQLite's substr(date_created, 1, 7) extracts YYYY-MM from YYYY-MM-DD
        monthly_rows = conn.execute(
            "SELECT substr(date_created, 1, 7) as month, SUM(amount) as total FROM expenses GROUP BY month ORDER BY month ASC"
        ).fetchall()
        monthly_spending = [{"month": row['month'], "amount": row['total']} for row in monthly_rows]
        
        # Recent transactions (limit 5)
        recent_rows = conn.execute(
            'SELECT * FROM expenses ORDER BY date_created DESC, id DESC LIMIT 5'
        ).fetchall()
        recent_transactions = [dict(row) for row in recent_rows]
        
        # Retrieve budget settings
        budget = float(get_setting('budget', '15000.0'))
        savings_target = float(get_setting('savings_target', '5000.0'))
        current_savings = float(get_setting('current_savings', '0.0'))
        
        return {
            "total_expenses": total,
            "category_totals": category_totals,
            "monthly_spending": monthly_spending,
            "recent_transactions": recent_transactions,
            "budget": budget,
            "savings_target": savings_target,
            "current_savings": current_savings
        }
    finally:
        conn.close()
