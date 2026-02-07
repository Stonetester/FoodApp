from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
import json

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    recipes = db.relationship('Recipe', backref='user', lazy=True, cascade='all, delete-orphan')
    pantry_items = db.relationship('PantryItem', backref='user', lazy=True, cascade='all, delete-orphan')
    meal_plans = db.relationship('MealPlan', backref='user', lazy=True, cascade='all, delete-orphan')
    meal_history = db.relationship('MealHistory', backref='user', lazy=True, cascade='all, delete-orphan')
    sent_friend_requests = db.relationship(
        'FriendRequest',
        foreign_keys='FriendRequest.sender_id',
        backref='sender',
        lazy=True,
        cascade='all, delete-orphan'
    )
    received_friend_requests = db.relationship(
        'FriendRequest',
        foreign_keys='FriendRequest.receiver_id',
        backref='receiver',
        lazy=True,
        cascade='all, delete-orphan'
    )
    friendships = db.relationship(
        'Friendship',
        foreign_keys='Friendship.user_id',
        backref='user',
        lazy=True,
        cascade='all, delete-orphan'
    )
    
    def __repr__(self):
        return f'<User {self.username}>'

class Recipe(db.Model):
    __tablename__ = 'recipes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    instructions = db.Column(db.Text)  # JSON string or plain text
    prep_time = db.Column(db.Integer)  # minutes
    cook_time = db.Column(db.Integer)  # minutes
    servings = db.Column(db.Integer)
    image_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    ingredients = db.relationship('RecipeIngredient', backref='recipe', lazy=True, cascade='all, delete-orphan')
    tags = db.relationship('RecipeTag', backref='recipe', lazy=True, cascade='all, delete-orphan')
    meal_plans = db.relationship('MealPlan', backref='recipe', lazy=True)
    meal_history = db.relationship('MealHistory', backref='recipe', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'instructions': self.instructions,
            'prep_time': self.prep_time,
            'cook_time': self.cook_time,
            'servings': self.servings,
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'ingredients': [ing.to_dict() for ing in self.ingredients],
            'tags': [tag.tag for tag in self.tags]
        }
    
    def __repr__(self):
        return f'<Recipe {self.title}>'

class FriendRequest(db.Model):
    __tablename__ = 'friend_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default='pending', index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('sender_id', 'receiver_id', name='unique_friend_request'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'receiver_id': self.receiver_id,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<FriendRequest {self.sender_id}->{self.receiver_id} ({self.status})>'

class Friendship(db.Model):
    __tablename__ = 'friendships'
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    friend_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.Index('idx_friendships_user_friend', 'user_id', 'friend_id'),
    )
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'friend_id': self.friend_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Friendship {self.user_id}->{self.friend_id}>'

class RecipeIngredient(db.Model):
    __tablename__ = 'recipe_ingredients'
    
    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False, index=True)
    ingredient_name = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Float)
    unit = db.Column(db.String(50))
    nutritional_info = db.Column(db.Text)  # JSON string
    
    def to_dict(self):
        nutritional = {}
        if self.nutritional_info:
            try:
                nutritional = json.loads(self.nutritional_info)
            except:
                pass
        return {
            'id': self.id,
            'ingredient_name': self.ingredient_name,
            'quantity': self.quantity,
            'unit': self.unit,
            'nutritional_info': nutritional
        }
    
    def __repr__(self):
        return f'<RecipeIngredient {self.ingredient_name}>'

class RecipeTag(db.Model):
    __tablename__ = 'recipe_tags'
    
    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False, index=True)
    tag = db.Column(db.String(50), nullable=False, index=True)
    
    __table_args__ = (db.UniqueConstraint('recipe_id', 'tag', name='unique_recipe_tag'),)
    
    def __repr__(self):
        return f'<RecipeTag {self.tag}>'

class PantryItem(db.Model):
    __tablename__ = 'pantry_items'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    item_name = db.Column(db.String(200), nullable=False)
    barcode = db.Column(db.String(100), index=True)
    quantity = db.Column(db.Float)
    unit = db.Column(db.String(50))
    expiry_date = db.Column(db.Date, index=True)
    nutritional_info = db.Column(db.Text)  # JSON string
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        nutritional = {}
        if self.nutritional_info:
            try:
                nutritional = json.loads(self.nutritional_info)
            except:
                pass
        return {
            'id': self.id,
            'item_name': self.item_name,
            'barcode': self.barcode,
            'quantity': self.quantity,
            'unit': self.unit,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'nutritional_info': nutritional,
            'added_at': self.added_at.isoformat() if self.added_at else None
        }
    
    def __repr__(self):
        return f'<PantryItem {self.item_name}>'

class MealPlan(db.Model):
    __tablename__ = 'meal_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False, index=True)
    planned_date = db.Column(db.Date, nullable=False, index=True)
    meal_type = db.Column(db.String(20), nullable=False)  # breakfast, lunch, dinner, snack
    notes = db.Column(db.Text)
    
    __table_args__ = (db.Index('idx_user_date', 'user_id', 'planned_date'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'recipe_id': self.recipe_id,
            'recipe': self.recipe.to_dict() if self.recipe else None,
            'planned_date': self.planned_date.isoformat() if self.planned_date else None,
            'meal_type': self.meal_type,
            'notes': self.notes
        }
    
    def __repr__(self):
        return f'<MealPlan {self.planned_date} {self.meal_type}>'

class MealHistory(db.Model):
    __tablename__ = 'meal_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False, index=True)
    consumed_date = db.Column(db.Date, nullable=False, index=True)
    meal_type = db.Column(db.String(20), nullable=False)
    rating = db.Column(db.Integer)  # 1-5 stars
    notes = db.Column(db.Text)
    
    __table_args__ = (db.Index('idx_user_consumed', 'user_id', 'consumed_date'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'recipe_id': self.recipe_id,
            'recipe': self.recipe.to_dict() if self.recipe else None,
            'consumed_date': self.consumed_date.isoformat() if self.consumed_date else None,
            'meal_type': self.meal_type,
            'rating': self.rating,
            'notes': self.notes
        }
    
    def __repr__(self):
        return f'<MealHistory {self.consumed_date}>'
