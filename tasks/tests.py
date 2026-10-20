from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Task


class TaskAPITests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username='shifan',
            password='StrongPass123'
        )

        self.other_user = User.objects.create_user(
            username='another_user',
            password='StrongPass123'
        )

        self.task = Task.objects.create(
            title='Learn Django',
            description='Practice DRF',
            user=self.user
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(self.user).access_token}'
        )

    def test_authenticated_user_can_list_own_tasks(self):
        response = self.client.get('/api/tasks/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'Learn Django')

    def test_user_cannot_see_another_users_tasks(self):
        Task.objects.create(
            title='Private task',
            description='Belongs to another user',
            user=self.other_user
        )

        response = self.client.get('/api/tasks/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_user_cannot_retrieve_another_users_task(self):
        other_task = Task.objects.create(
            title='Private task',
            description='Belongs to another user',
            user=self.other_user
        )

        response = self.client.get(f'/api/tasks/{other_task.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_authenticated_user_can_create_task(self):
        response = self.client.post(
            '/api/tasks/',
            {
                'title': 'Build frontend',
                'description': 'Use JavaScript Fetch',
                'status': 'PENDING',
                'priority': 'HIGH',
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Task.objects.filter(
                title='Build frontend',
                user=self.user
            ).exists()
        )

    def test_unauthenticated_user_cannot_access_tasks(self):
        self.client.credentials()

        response = self.client.get('/api/tasks/')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
