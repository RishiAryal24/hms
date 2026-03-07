from django.contrib.auth.models import AbstractUser, Permission
from django.db import models

class User(AbstractUser):
    # Add tenant-specific fields if needed
    pass

class Role(models.Model):
    name = models.CharField(max_length=50)
    permissions = models.ManyToManyField(Permission, blank=True)

    def __str__(self):
        return self.name