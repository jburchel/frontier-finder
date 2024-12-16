import unittest
import json
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app

class TestFrontierFinder(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_index_route(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_get_countries(self):
        response = self.client.get('/api/countries')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        
    def test_get_upgs(self):
        # First get a valid country from the countries endpoint
        countries_response = self.client.get('/api/countries')
        countries = json.loads(countries_response.data)
        if countries:
            test_country = countries[0]
            response = self.client.get(f'/api/upgs/{test_country}')
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertIsInstance(data, list)

    def test_search_endpoint(self):
        # First get a valid country and UPG
        countries_response = self.client.get('/api/countries')
        countries = json.loads(countries_response.data)
        if countries:
            test_country = countries[0]
            upgs_response = self.client.get(f'/api/upgs/{test_country}')
            upgs = json.loads(upgs_response.data)
            if upgs:
                test_data = {
                    'country': test_country,
                    'upg': upgs[0],
                    'radius': 100,
                    'units': 'kilometers',
                    'type': 'both'
                }
                response = self.client.post('/api/search',
                                          data=json.dumps(test_data),
                                          content_type='application/json')
                self.assertEqual(response.status_code, 200)
                data = json.loads(response.data)
                self.assertIn('fpgs', data)
                self.assertIn('uupgs', data)

if __name__ == '__main__':
    unittest.main()
