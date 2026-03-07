from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from apps.accounts.models import CustomUser


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = CustomUser
        fields = ['email', 'full_name', 'phone', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        return CustomUser.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model  = CustomUser
        fields = [
            'id', 'email', 'full_name', 'phone', 'role',
            'is_active', 'is_verified', 'airport',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'role', 'is_verified', 'created_at', 'updated_at']


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['full_name', 'phone', 'role', 'is_active', 'airport']

    def validate(self, attrs):
        role = attrs.get('role', getattr(self.instance, 'role', None))
        airport = attrs.get('airport', getattr(self.instance, 'airport', None))
        if role == CustomUser.Role.SUPERVISOR and airport is None:
            raise serializers.ValidationError({'airport': 'Supervisor must be assigned to an airport.'})
        if role in [CustomUser.Role.CUSTOMER, CustomUser.Role.ADMIN]:
            attrs['airport'] = None
        return attrs


class UserMiniSerializer(serializers.ModelSerializer):

    class Meta:
        model  = CustomUser
        fields = ['id', 'full_name', 'email', 'role']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()

