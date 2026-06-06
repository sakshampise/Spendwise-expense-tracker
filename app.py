import io
import csv
from datetime import datetime
from flask import Flask, request, jsonify, render_template, Response
import database
import insights

app = Flask(__name__)

# Initialize database on application start
database.init_db()

# Updated categories list tailored for Indian students
VALID_CATEGORIES = {
    "Food", 
    "Travel", 
    "Education", 
    "Shopping", 
    "Entertainment", 
    "College Expenses", 
    "Hostel", 
    "Other"
}

def validate_expense_data(data):
    """Validates the input parameters for creating or updating an expense."""
    errors = []
    
    title = data.get('title', '').strip()
    if not title:
        errors.append("Expense title cannot be empty.")
    elif len(title) > 100:
        errors.append("Expense title must be under 100 characters.")
        
    try:
        amount = float(data.get('amount', 0))
        if amount <= 0:
            errors.append("Amount must be a positive number greater than 0.")
    except (ValueError, TypeError):
        errors.append("Amount must be a valid number.")
        
    category = data.get('category', '')
    if category not in VALID_CATEGORIES:
        errors.append(f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}")
        
    date_str = data.get('date_created', '')
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
    except (ValueError, TypeError):
        errors.append("Invalid date format. Must be YYYY-MM-DD.")
        
    return errors

@app.route('/')
def index():
    """Serves the main dashboard application UI."""
    return render_template('index.html')

@app.route('/api/expenses', methods=['GET'])
def get_expenses_api():
    """Retrieves all expenses based on filter and sorting parameters."""
    search = request.args.get('search', '').strip() or None
    category = request.args.get('category', '').strip() or None
    sort_by = request.args.get('sort_by', 'date')
    sort_order = request.args.get('sort_order', 'desc')
    
    try:
        expenses = database.get_expenses(
            search=search, 
            category=category, 
            sort_by=sort_by, 
            sort_order=sort_order
        )
        return jsonify(expenses), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve expenses: {str(e)}"}), 500

@app.route('/api/expenses', methods=['POST'])
def add_expense_api():
    """Adds a new expense after validating inputs."""
    data = request.get_json() or {}
    errors = validate_expense_data(data)
    if errors:
        return jsonify({"errors": errors}), 400
        
    try:
        expense_id = database.add_expense(
            title=data['title'].strip(),
            amount=float(data['amount']),
            category=data['category'],
            date_created=data['date_created']
        )
        new_expense = database.get_expense(expense_id)
        return jsonify(new_expense), 201
    except Exception as e:
        return jsonify({"error": f"Failed to add expense: {str(e)}"}), 500

@app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
def update_expense_api(expense_id):
    """Updates an existing expense after validation."""
    expense = database.get_expense(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found."}), 404
        
    data = request.get_json() or {}
    errors = validate_expense_data(data)
    if errors:
        return jsonify({"errors": errors}), 400
        
    try:
        success = database.update_expense(
            expense_id=expense_id,
            title=data['title'].strip(),
            amount=float(data['amount']),
            category=data['category'],
            date_created=data['date_created']
        )
        if success:
            updated_expense = database.get_expense(expense_id)
            return jsonify(updated_expense), 200
        return jsonify({"error": "No updates were performed."}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to update expense: {str(e)}"}), 500

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense_api(expense_id):
    """Deletes an expense by ID."""
    expense = database.get_expense(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found."}), 404
        
    try:
        success = database.delete_expense(expense_id)
        if success:
            return jsonify({"message": "Expense deleted successfully."}), 200
        return jsonify({"error": "Failed to delete expense."}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to delete expense: {str(e)}"}), 500

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_api():
    """Retrieves aggregated stats and recent items for the Dashboard widgets."""
    try:
        summary = database.get_dashboard_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve dashboard stats: {str(e)}"}), 500

@app.route('/api/settings', methods=['GET'])
def get_settings_api():
    """Retrieves application configuration values (monthly budget, savings target, current savings)."""
    try:
        settings = {
            "budget": float(database.get_setting('budget', '15000.0')),
            "savings_target": float(database.get_setting('savings_target', '5000.0')),
            "current_savings": float(database.get_setting('current_savings', '0.0'))
        }
        return jsonify(settings), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve settings: {str(e)}"}), 500

@app.route('/api/settings', methods=['POST'])
def update_settings_api():
    """Updates one or more application settings with input validation."""
    data = request.get_json() or {}
    errors = []
    
    if 'budget' in data:
        try:
            budget = float(data['budget'])
            if budget < 0:
                errors.append("Monthly budget must be a non-negative number.")
        except (ValueError, TypeError):
            errors.append("Monthly budget must be a valid number.")
            
    if 'savings_target' in data:
        try:
            savings_target = float(data['savings_target'])
            if savings_target < 0:
                errors.append("Savings target must be a non-negative number.")
        except (ValueError, TypeError):
            errors.append("Savings target must be a valid number.")
            
    if 'current_savings' in data:
        try:
            current_savings = float(data['current_savings'])
            if current_savings < 0:
                errors.append("Current savings must be a non-negative number.")
        except (ValueError, TypeError):
            errors.append("Current savings must be a valid number.")
            
    if errors:
        return jsonify({"errors": errors}), 400
        
    try:
        if 'budget' in data:
            database.set_setting('budget', str(data['budget']))
        if 'savings_target' in data:
            database.set_setting('savings_target', str(data['savings_target']))
        if 'current_savings' in data:
            database.set_setting('current_savings', str(data['current_savings']))
            
        updated_settings = {
            "budget": float(database.get_setting('budget', '15000.0')),
            "savings_target": float(database.get_setting('savings_target', '5000.0')),
            "current_savings": float(database.get_setting('current_savings', '0.0'))
        }
        return jsonify(updated_settings), 200
    except Exception as e:
        return jsonify({"error": f"Failed to update settings: {str(e)}"}), 500

@app.route('/api/insights', methods=['GET'])
def get_insights_api():
    """Generates personalized AI-Assisted spending insights from expense trends and settings."""
    try:
        all_expenses = database.get_expenses(sort_by='date', sort_order='asc')
        budget = float(database.get_setting('budget', '15000.0'))
        savings_target = float(database.get_setting('savings_target', '5000.0'))
        current_savings = float(database.get_setting('current_savings', '0.0'))
        
        all_insights = insights.generate_insights(all_expenses, budget, savings_target, current_savings)
        return jsonify(all_insights), 200
    except Exception as e:
        return jsonify({"error": f"Failed to generate insights: {str(e)}"}), 500

@app.route('/api/expenses/export', methods=['GET'])
def export_expenses_csv():
    """Exports all expenses as a downloadable CSV file using Rupee formatting."""
    try:
        expenses = database.get_expenses(sort_by='date', sort_order='desc')
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header using Rupee Symbol
        writer.writerow(['ID', 'Title', 'Amount (INR ₹)', 'Category', 'Date Created'])
        
        for exp in expenses:
            writer.writerow([
                exp['id'],
                exp['title'],
                exp['amount'],
                exp['category'],
                exp['date_created']
            ])
            
        csv_data = output.getvalue()
        output.close()
        
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={
                "Content-disposition": "attachment; filename=expenses_export.csv"
            }
        )
    except Exception as e:
        return jsonify({"error": f"Failed to export CSV: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
