from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import RegisterView, TaskViewSet

router = DefaultRouter()
router.register('tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
] + router.urls
