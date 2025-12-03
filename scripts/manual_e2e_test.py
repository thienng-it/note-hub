"""
End-to-end test script for Beautiful Notes App
Tests all major features and functionality
"""

import requests
from bs4 import BeautifulSoup

BASE_URL = "http://127.0.0.1:5000"
session = requests.Session()

def test_login(username, password):
    """Test login functionality"""
    print(f"\n🔐 Testing login with {username}...")
    response = session.get(f"{BASE_URL}/login")
    if response.status_code != 200:
        print(f"❌ Failed to load login page: {response.status_code}")
        return False
    
    # Extract CSRF token
    soup = BeautifulSoup(response.text, 'html.parser')
    csrf_token = soup.find('input', {'name': 'csrf_token'})
    if not csrf_token:
        print("❌ CSRF token not found")
        return False
    
    # Login
    login_data = {
        'username': username,
        'password': password,
        'csrf_token': csrf_token['value']
    }
    response = session.post(f"{BASE_URL}/login", data=login_data, allow_redirects=False)
    
    if response.status_code == 302:
        print(f"✅ Login successful for {username}")
        return True
    else:
        print(f"❌ Login failed: {response.status_code}")
        return False

def test_create_note(title, body):
    """Test note creation"""
    print(f"\n📝 Testing note creation: {title}...")
    response = session.get(f"{BASE_URL}/note/new")
    if response.status_code != 200:
        print(f"❌ Failed to load new note page: {response.status_code}")
        return None
    
    soup = BeautifulSoup(response.text, 'html.parser')
    csrf_token = soup.find('input', {'name': 'csrf_token'})
    if not csrf_token:
        print("❌ CSRF token not found")
        return None
    
    note_data = {
        'title': title,
        'body': body,
        'tags': 'test, e2e',
        'csrf_token': csrf_token['value']
    }
    response = session.post(f"{BASE_URL}/note/new", data=note_data, allow_redirects=False)
    
    if response.status_code == 302:
        # Extract note ID from redirect
        location = response.headers.get('Location', '')
        if '/note/' in location:
            note_id = location.split('/note/')[-1]
            print(f"✅ Note created successfully: ID {note_id}")
            return note_id
    print(f"❌ Note creation failed: {response.status_code}")
    return None

def test_create_task(title, description):
    """Test task creation"""
    print(f"\n✅ Testing task creation: {title}...")
    response = session.get(f"{BASE_URL}/task/new")
    if response.status_code != 200:
        print(f"❌ Failed to load new task page: {response.status_code}")
        return None
    
    soup = BeautifulSoup(response.text, 'html.parser')
    csrf_token = soup.find('input', {'name': 'csrf_token'})
    if not csrf_token:
        print("❌ CSRF token not found")
        return None
    
    task_data = {
        'title': title,
        'description': description,
        'priority': 'high',
        'csrf_token': csrf_token['value']
    }
    response = session.post(f"{BASE_URL}/task/new", data=task_data, allow_redirects=False)
    
    if response.status_code == 302:
        print(f"✅ Task created successfully")
        return True
    print(f"❌ Task creation failed: {response.status_code}")
    return False

def test_profile_edit():
    """Test profile editing"""
    print(f"\n👤 Testing profile edit...")
    response = session.get(f"{BASE_URL}/profile/edit")
    if response.status_code != 200:
        print(f"❌ Failed to load edit profile page: {response.status_code}")
        return False
    
    soup = BeautifulSoup(response.text, 'html.parser')
    csrf_token = soup.find('input', {'name': 'csrf_token'})
    if not csrf_token:
        print("❌ CSRF token not found")
        return False
    
    profile_data = {
        'username': 'testuser',
        'bio': 'Test bio for E2E testing',
        'email': 'test@example.com',
        'csrf_token': csrf_token['value']
    }
    response = session.post(f"{BASE_URL}/profile/edit", data=profile_data, allow_redirects=False)
    
    if response.status_code == 302:
        print(f"✅ Profile updated successfully")
        return True
    print(f"❌ Profile update failed: {response.status_code}")
    return False

def test_routes():
    """Test all major routes are accessible"""
    print(f"\n🔍 Testing route accessibility...")
    routes = [
        ('/', 'Home/Index'),
        ('/tasks', 'Tasks'),
        ('/profile', 'Profile'),
        ('/invite', 'Invite'),
    ]
    
    all_ok = True
    for route, name in routes:
        response = session.get(f"{BASE_URL}{route}")
        if response.status_code == 200:
            print(f"✅ {name} page accessible")
        else:
            print(f"❌ {name} page failed: {response.status_code}")
            all_ok = False
    
    return all_ok

def main():
    """Run all tests"""
    print("=" * 60)
    print("🧪 Beautiful Notes App - End-to-End Test Suite")
    print("=" * 60)
    
    # Test login
    if not test_login('admin', 'ChangeMeNow!42'):
        print("\n❌ Login failed. Cannot continue tests.")
        return
    
    # Test routes
    test_routes()
    
    # Test note creation
    note_id = test_create_note('E2E Test Note', 'This is a test note created during E2E testing.')
    
    # Test task creation
    test_create_task('E2E Test Task', 'This is a test task')
    
    # Test profile edit
    test_profile_edit()
    
    print("\n" + "=" * 60)
    print("✅ E2E Testing Complete!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ Cannot connect to server. Make sure the app is running on http://127.0.0.1:5000")
    except Exception as e:
        print(f"\n❌ Test error: {e}")
        import traceback
        traceback.print_exc()

