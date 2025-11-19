from flask import Flask, render_template, request, flash, redirect, url_for
#asi pouzivat
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os

app = Flask(__name__)

@app.route('/')
def home():
    return "alo!"

if __name__ == '__main__':
    app.run(debug=True)