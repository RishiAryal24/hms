from decimal import Decimal

from .models import ChargeCategory, Invoice, InvoiceLine


def get_or_create_open_invoice(patient, created_by=None, admission=None, notes=""):
    invoice = Invoice.objects.filter(
        patient=patient,
        admission=admission,
        status__in=["draft", "issued", "partial"],
    ).order_by("-created_at").first()

    if invoice:
        return invoice

    invoice = Invoice.objects.create(
        patient=patient,
        admission=admission,
        created_by=created_by if getattr(created_by, "is_authenticated", False) else None,
        notes=notes,
    )
    invoice.recalculate()
    return invoice


def add_billable_line(
    *,
    patient,
    description,
    unit_price,
    created_by=None,
    admission=None,
    category=ChargeCategory.OTHER,
    source_module="",
    source_id="",
    quantity=1,
):
    price = Decimal(str(unit_price or 0))
    if price <= 0:
        return None

    invoice = get_or_create_open_invoice(
        patient=patient,
        admission=admission,
        created_by=created_by,
        notes="Auto-created from clinical activity.",
    )

    if source_module and source_id:
        existing = InvoiceLine.objects.filter(
            invoice__patient=patient,
            source_module=source_module,
            source_id=str(source_id),
        ).first()
        if existing:
            return existing

    return InvoiceLine.objects.create(
        invoice=invoice,
        description=description,
        category=category,
        quantity=quantity,
        unit_price=price,
        source_module=source_module,
        source_id=str(source_id) if source_id else "",
    )
