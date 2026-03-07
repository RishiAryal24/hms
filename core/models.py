# ----------------------------------------------------------------------
# LOCATION: HMS/core/models.py
# ACTION:   REPLACE the entire contents of this file
# ----------------------------------------------------------------------

from django.db import models


class TimeStampedModel(models.Model):
    """
    Abstract base model that provides created_at and updated_at
    fields. All HMS models inherit from this.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True