from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed, MultipleFileField
from wtforms import StringField, PasswordField, SubmitField, TextAreaField, FloatField, SelectField
from wtforms.validators import DataRequired, Length, EqualTo, Email, ValidationError
from extensions import db
from models import User


class ChangePasswordForm(FlaskForm):
    current_password = PasswordField('Súčasné heslo', validators=[DataRequired()])
    new_password = PasswordField('Nové heslo', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Potvrdenie nového hesla',
                                     validators=[DataRequired(),
                                                 EqualTo('new_password', message='Heslá sa musia zhodovať.')])
    submit = SubmitField('Zmeniť heslo')


class ListingForm(FlaskForm):
    title = StringField('Názov', validators=[DataRequired(), Length(min=5, max=200)])
    description = TextAreaField('Popis', validators=[DataRequired(), Length(min=10)])
    price = FloatField('Cena (€)', validators=[DataRequired()])
    location = StringField('Lokalita', validators=[DataRequired()])
    category_id = SelectField('Kategória', coerce=int, validators=[DataRequired()])
    images = MultipleFileField('Obrázky', validators=[
        FileAllowed(['jpg', 'jpeg', 'png', 'gif'], 'Len obrázky sú povolené (jpg, jpeg, png, gif)!')
    ])
    submit = SubmitField('Uložiť inzerát')


class RegistrationForm(FlaskForm):
    username = StringField('Používateľské meno', validators=[DataRequired(), Length(min=2, max=20)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Heslo', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Potvrdenie hesla',
                                     validators=[DataRequired(),
                                                 EqualTo('password', message='Heslá sa musia zhodovať.')])
    submit = SubmitField('Registrovať')

    def validate_username(self, username):
        user = db.session.execute(db.select(User).filter_by(username=username.data)).scalar_one_or_none()
        if user:
            raise ValidationError('Toto meno je už obsadené. Zvoľte si iné.')

    def validate_email(self, email):
        user = db.session.execute(db.select(User).filter_by(email=email.data)).scalar_one_or_none()
        if user:
            raise ValidationError('Táto emailová adresa je už zaregistrovaná.')


class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Heslo', validators=[DataRequired()])
    submit = SubmitField('Prihlásiť sa')