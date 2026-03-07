from django.contrib import admin

from apps.services.models import Service, ServiceCategory, ServiceStage


class ServiceStageInline(admin.TabularInline):
    model = ServiceStage
    extra = 1
    ordering = ("stage_order",)
    fields = ("stage_order", "stage_name", "estimated_duration_minutes", "description")


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "description")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "base_price", "duration_minutes", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("name", "description", "category__name")
    inlines = [ServiceStageInline]


@admin.register(ServiceStage)
class ServiceStageAdmin(admin.ModelAdmin):
    list_display = ("service", "stage_order", "stage_name", "estimated_duration_minutes")
    list_filter = ("service__category", "service")
    search_fields = ("service__name", "stage_name", "description")
    ordering = ("service", "stage_order")
