from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app.models import db, User
from app.email_service import send_email
from werkzeug.security import generate_password_hash, check_password_hash
import re
from sqlalchemy.exc import IntegrityError

auth_bp = Blueprint('auth', __name__)

# Email validation regex
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

def validate_email(email):
    """Validate email format"""
    return EMAIL_REGEX.match(email) is not None

def validate_password(password):
    """Validate password strength (min 8 chars, at least one letter and one number)"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Za-z]', password):
        return False, "Password must contain at least one letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"

def validate_username(username):
    """Validate username format"""
    if len(username) < 3:
        return False, "Username must be at least 3 characters long"
    if len(username) > 80:
        return False, "Username must be less than 80 characters"
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return False, "Username can only contain letters, numbers, underscores, and hyphens"
    return True, "Username is valid"

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user with validation"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    # Validation
    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required'}), 400
    
    # Validate username
    valid, message = validate_username(username)
    if not valid:
        return jsonify({'error': message}), 400
    
    # Validate email
    if not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Validate password
    valid, message = validate_password(password)
    if not valid:
        return jsonify({'error': message}), 400
    
    # Check if user already exists
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    try:
        # Create new user
        password_hash = generate_password_hash(password)
        user = User(username=username, email=email, password_hash=password_hash)
        
        db.session.add(user)
        db.session.commit()

        # Trigger welcome email only after successful database commit.
        send_email(
            user.email,
            'Welcome to Modo Gusto',
            'Welcome to Modo Gusto.\nCook smarter. Share better. Eat well.'
        )

        return jsonify({
            'message': 'User created successfully',
            'user_id': user.id,
            'username': user.username
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {e}")
        return jsonify({'error': 'Failed to create user'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user with rate limiting"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    # Find user
    user = User.query.filter_by(username=username).first()
    
    if user and check_password_hash(user.password_hash, password):
        login_user(user, remember=True)
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        }), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout current user"""
    logout_user()
    return jsonify({'message': 'Logout successful'}), 200

@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current user information"""
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'created_at': current_user.created_at.isoformat() if current_user.created_at else None
    }), 200

@auth_bp.route('/settings/profile', methods=['PUT'])
@login_required
def update_profile_settings():
    """Update username and/or email for the current user."""
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip()

    if not username or not email:
        return jsonify({'error': 'Username and email are required'}), 400

    valid, message = validate_username(username)
    if not valid:
        return jsonify({'error': message}), 400

    if not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400

    existing_username = User.query.filter(User.username == username, User.id != current_user.id).first()
    if existing_username:
        return jsonify({'error': 'Username already exists'}), 400

    existing_email = User.query.filter(User.email == email, User.id != current_user.id).first()
    if existing_email:
        return jsonify({'error': 'Email already exists'}), 400

    current_user.username = username
    current_user.email = email

    try:
        db.session.commit()
        return jsonify({
            'message': 'Profile updated successfully',
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email
            }
        }), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Username or email already exists'}), 400
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to update profile'}), 500

@auth_bp.route('/settings/password', methods=['PUT'])
@login_required
def change_password():
    """Change account password for the current user."""
    data = request.get_json() or {}
    current_password = data.get('current_password') or ''
    new_password = data.get('new_password') or ''

    if not current_password or not new_password:
        return jsonify({'error': 'Current password and new password are required'}), 400

    if not check_password_hash(current_user.password_hash, current_password):
        return jsonify({'error': 'Current password is incorrect'}), 400

    valid, message = validate_password(new_password)
    if not valid:
        return jsonify({'error': message}), 400

    current_user.password_hash = generate_password_hash(new_password)
    try:
        db.session.commit()
        return jsonify({'message': 'Password changed successfully'}), 200
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to change password'}), 500

@auth_bp.route('/settings/account', methods=['DELETE'])
@login_required
def delete_account():
    """Fully delete current user account and associated data."""
    data = request.get_json() or {}
    password = data.get('password') or ''

    if not password:
        return jsonify({'error': 'Password is required'}), 400

    if not check_password_hash(current_user.password_hash, password):
        return jsonify({'error': 'Password is incorrect'}), 400

    user_id = current_user.id

    try:
        FriendRequest.query.filter(
            (FriendRequest.sender_id == user_id) | (FriendRequest.receiver_id == user_id)
        ).delete(synchronize_session=False)
        Friendship.query.filter(
            (Friendship.user_id == user_id) | (Friendship.friend_id == user_id)
        ).delete(synchronize_session=False)

        recipe_ids = [row[0] for row in db.session.query(Recipe.id).filter_by(user_id=user_id).all()]
        if recipe_ids:
            MealPlan.query.filter(MealPlan.recipe_id.in_(recipe_ids)).delete(synchronize_session=False)
            MealHistory.query.filter(MealHistory.recipe_id.in_(recipe_ids)).delete(synchronize_session=False)

        MealPlan.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        MealHistory.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        PantryItem.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        Recipe.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        User.query.filter_by(id=user_id).delete(synchronize_session=False)

        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete account'}), 500

    logout_user()
    return jsonify({'message': 'Account deleted successfully'}), 200

@auth_bp.route('/check', methods=['GET'])
def check_auth():
    """Check if user is authenticated"""
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username
            }
        }), 200
    else:
        return jsonify({'authenticated': False}), 200
