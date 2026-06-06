from datetime import datetime

def generate_insights(expenses, budget, savings_target, current_savings):
    """
    Generates personalized, student-focused spending insights and savings tips.
    Tailored specifically for Indian college and engineering student demographics.
    """
    if not expenses:
        return [
            {
                "type": "info",
                "category": "General",
                "title": "Welcome to SpendWise!",
                "description": "Start logging your daily canteen bills, travel passes, hostel fees, and college supplies to unlock smart spending insights."
            }
        ]

    total_amount = sum(e['amount'] for e in expenses)
    if total_amount == 0:
        return [
            {
                "type": "info",
                "category": "General",
                "title": "No spending recorded",
                "description": "You have logged expenses, but your total spending is ₹0. Add positive values to see insights."
            }
        ]

    # Calculate category breakdowns
    category_totals = {}
    for e in expenses:
        cat = e['category']
        category_totals[cat] = category_totals.get(cat, 0.0) + e['amount']

    # Percentages
    category_percentages = {cat: (amt / total_amount) * 100 for cat, amt in category_totals.items()}
    
    insights = []

    # 1. Budget Health Checks
    if budget > 0:
        budget_used_pct = (total_amount / budget) * 100
        if budget_used_pct > 100:
            excess = total_amount - budget
            insights.append({
                "type": "warning",
                "category": "Budget Health",
                "title": "Critical Budget Overrun!",
                "description": f"You have exceeded your monthly budget of ₹{budget:,.2f} by ₹{excess:,.2f} ({budget_used_pct:.1f}% used). Consider pausing non-essential shopping immediately."
            })
        elif budget_used_pct >= 80:
            insights.append({
                "type": "warning",
                "category": "Budget Health",
                "title": "Budget Threshold Alert",
                "description": f"You spent {budget_used_pct:.1f}% of your ₹{budget:,.2f} monthly budget (₹{total_amount:,.2f} spent). Consider delaying shopping and dining out to stay in bounds."
            })
        elif budget_used_pct <= 60:
            insights.append({
                "type": "success",
                "category": "Budget Health",
                "title": "Healthy Budget Margin",
                "description": f"Excellent discipline! You have consumed only {budget_used_pct:.1f}% of your monthly budget (₹{budget:,.2f}). You are on track to save pocket money."
            })
        else:
            insights.append({
                "type": "info",
                "category": "Budget Health",
                "title": "Moderate Budget Status",
                "description": f"You have consumed {budget_used_pct:.1f}% of your ₹{budget:,.2f} monthly budget. Manage your weekly allowances carefully for the remaining days."
            })

    # 2. Savings Goal Progress
    if savings_target > 0:
        savings_pct = (current_savings / savings_target) * 100
        if current_savings >= savings_target:
            insights.append({
                "type": "success",
                "category": "Savings Goal",
                "title": "Savings Target Achieved!",
                "description": f"Congratulations! You hit your savings target of ₹{savings_target:,.2f} (Saved: ₹{current_savings:,.2f}). Outstanding financial discipline!"
            })
        elif current_savings > 0:
            remaining_save = savings_target - current_savings
            insights.append({
                "type": "tip" if savings_pct >= 50 else "info",
                "category": "Savings Goal",
                "title": "Savings Progress Status",
                "description": f"You saved ₹{current_savings:,.2f} ({savings_pct:.1f}%) of your ₹{savings_target:,.2f} target. You are ₹{remaining_save:,.2f} away from your target savings."
            })
        else:
            insights.append({
                "type": "tip",
                "category": "Savings Goal",
                "title": "Kickstart Savings Target",
                "description": f"You have saved ₹0.00 toward your ₹{savings_target:,.2f} target. Set aside a small amount (like ₹200) right away to build savings momentum."
            })

    # 3. Monthly Comparison Trends (MoM)
    monthly_expenses = {}
    for e in expenses:
        month = e['date_created'][:7]  # YYYY-MM
        monthly_expenses[month] = monthly_expenses.get(month, 0.0) + e['amount']

    sorted_months = sorted(monthly_expenses.keys())
    if len(sorted_months) >= 2:
        current_month = sorted_months[-1]
        prev_month = sorted_months[-2]
        current_total = monthly_expenses[current_month]
        prev_total = monthly_expenses[prev_month]
        
        if prev_total > 0:
            mom_pct = ((current_total - prev_total) / prev_total) * 100
            curr_month_name = datetime.strptime(current_month, '%Y-%m').strftime('%B')
            prev_month_name = datetime.strptime(prev_month, '%Y-%m').strftime('%B')
            
            if mom_pct > 10:
                insights.append({
                    "type": "warning",
                    "category": "Monthly Trend",
                    "title": "Monthly Spending Increase",
                    "description": f"Your spending in {curr_month_name} (₹{current_total:,.2f}) has increased by {mom_pct:.1f}% compared to {prev_month_name} (₹{prev_total:,.2f}). Check for budget leaks."
                })
            elif mom_pct < -10:
                savings_saved = prev_total - current_total
                insights.append({
                    "type": "success",
                    "category": "Monthly Trend",
                    "title": "Spending Reduction Success",
                    "description": f"Great! Your monthly spend fell by {abs(mom_pct):.1f}% from {prev_month_name} to {curr_month_name}, saving you ₹{savings_saved:,.2f}."
                })

    # 4. Category Overspending Alerts (>30%)
    for cat, pct in category_percentages.items():
        if pct > 30 and cat != 'Other':
            insights.append({
                "type": "warning",
                "category": cat,
                "title": f"High Expense in {cat}",
                "description": f"{cat} accounts for {pct:.1f}% of your total spending. " + get_student_category_tip(cat)
            })

    # 5. Wants vs Needs Check (Demographics Check)
    wants_total = category_totals.get('Shopping', 0.0) + category_totals.get('Entertainment', 0.0)
    needs_total = (category_totals.get('Food', 0.0) + 
                   category_totals.get('Education', 0.0) + 
                   category_totals.get('Travel', 0.0) + 
                   category_totals.get('Hostel', 0.0) + 
                   category_totals.get('College Expenses', 0.0))
    
    if wants_total > needs_total:
        insights.append({
            "type": "warning",
            "category": "Budget Balance",
            "title": "Wants exceeding Essentials",
            "description": f"Your combined discretionary spending on Shopping & Entertainment (₹{wants_total:,.2f}) is higher than essentials like Hostel, Mess, Travel, and Education (₹{needs_total:,.2f}). We recommend curtailing impulse web orders."
        })
    elif wants_total > 0:
        insights.append({
            "type": "success",
            "category": "Budget Balance",
            "title": "Excellent Allocation Balance",
            "description": "Awesome! Your essentials (Mess, Hostel, Education) exceed discretionary purchases. Keep up this disciplined budget ratio!"
        })

    return insights

def get_student_category_tip(category):
    tips = {
        "Food": "dining out or ordering online. Utilizing mess plans and campus canteens rather than Zomato/Swiggy deliveries can save ₹1,500 monthly.",
        "Travel": "commutes by boarding local city buses, sharing auto-rickshaws, or using metro student discount cards.",
        "Education": "textbooks and project logs. Utilize library portals or share textbook expenses with classmates to divide costs.",
        "Shopping": "impulsive web shopping. Apply the 48-hour cool-off rule, and use student discount portals like UNiDAYS or Student Beans.",
        "Entertainment": "frequent movie outings and gaming. Opt for shared family subscriptions or look for free college fests and local cultural events.",
        "College Expenses": "fees, events, and printouts. Split team project equipment expenses cleanly using expense splitting tools.",
        "Hostel": "room rent and hostel utility bills. Switching off room lights, fans, and laptops when leaving the hostel helps save on shared bills."
    }
    tip_str = tips.get(category, "analyzing miscellaneous expenditures to find savings avenues.")
    return f"Try optimizing this by {tip_str}"
