#!/usr/bin/env python3
"""
Quick Testing Script for Insider Threat Detection System
Run this to automatically test all three dummy scenarios
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"

def print_header(text):
    print("\n" + "="*80)
    print(f"  {text}")
    print("="*80)

def print_response(response):
    try:
        data = response.json()
        print(json.dumps(data, indent=2))
    except:
        print(response.text)

def test_health():
    print_header("TEST: System Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print_response(response)
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_normal_session():
    print_header("TEST 1: Normal Session (Low Risk)")
    
    payload = {
        "user_id": "U101",
        "session_id": "S1001",
        "login_hour": 10,
        "files_accessed": 15,
        "sensitive_files": 0,
        "data_download_mb": 120,
        "session_duration_min": 40
    }
    
    print("Payload:")
    print(json.dumps(payload, indent=2))
    print("\nResponse:")
    
    try:
        response = requests.post(f"{BASE_URL}/log", json=payload)
        print(f"Status Code: {response.status_code}")
        print_response(response)
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_drift_session():
    print_header("TEST 2: Drift Session (Medium Risk)")
    
    payload = {
        "user_id": "U101",
        "session_id": "S1002",
        "login_hour": 19,
        "files_accessed": 35,
        "sensitive_files": 0,
        "data_download_mb": 250,
        "session_duration_min": 70
    }
    
    print("Payload:")
    print(json.dumps(payload, indent=2))
    print("\nResponse:")
    
    try:
        response = requests.post(f"{BASE_URL}/log", json=payload)
        print(f"Status Code: {response.status_code}")
        print_response(response)
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_malicious_session():
    print_header("TEST 3: Malicious Session (HIGH RISK - 🚨)")
    
    payload = {
        "user_id": "U101",
        "session_id": "S1003",
        "login_hour": 2,
        "files_accessed": 120,
        "sensitive_files": 6,
        "data_download_mb": 2500,
        "session_duration_min": 180
    }
    
    print("Payload:")
    print(json.dumps(payload, indent=2))
    print("\nResponse:")
    
    try:
        response = requests.post(f"{BASE_URL}/log", json=payload)
        print(f"Status Code: {response.status_code}")
        print_response(response)
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_trust_timeline():
    print_header("TEST: Get User Trust Timeline")
    
    try:
        response = requests.get(f"{BASE_URL}/trust/U101")
        print(f"Status Code: {response.status_code}")
        print_response(response)
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_alerts():
    print_header("TEST: Get Alerted Users (Trust < 75)")
    
    try:
        response = requests.get(f"{BASE_URL}/alerts", params={"threshold": 75})
        print(f"Status Code: {response.status_code}")
        print_response(response)
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_all_users():
    print_header("TEST: Get All Monitored Users")
    
    try:
        response = requests.get(f"{BASE_URL}/users")
        print(f"Status Code: {response.status_code}")
        print_response(response)
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("\n" + "🛡️  INSIDER THREAT DETECTION SYSTEM - AUTOMATED TEST SUITE" + "\n")
    print(f"Backend URL: {BASE_URL}")
    print(f"Test Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check if backend is running
    print("\n⏳ Checking backend connection...")
    try:
        requests.get(f"{BASE_URL}/health", timeout=2)
        print("✅ Backend is running!")
    except:
        print("❌ Backend is NOT running!")
        print(f"\nMake sure to start the backend first:")
        print("  python backend_main.py")
        return

    # Run all tests
    results = []
    
    results.append(("Health Check", test_health()))
    time.sleep(0.5)
    
    results.append(("Normal Session", test_normal_session()))
    time.sleep(0.5)
    
    results.append(("Drift Session", test_drift_session()))
    time.sleep(0.5)
    
    results.append(("Malicious Session", test_malicious_session()))
    time.sleep(0.5)
    
    results.append(("User Timeline", test_trust_timeline()))
    time.sleep(0.5)
    
    results.append(("Alerts Query", test_alerts()))
    time.sleep(0.5)
    
    results.append(("All Users", test_all_users()))
    
    # Summary
    print_header("TEST SUMMARY")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:8} | {test_name}")
    
    print("-" * 80)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! System is working correctly.")
        print("\n✨ Next Steps:")
        print("1. Open your browser and navigate to: http://localhost:3000")
        print("2. View the dashboard with real-time threat data")
        print("3. Click 'View Details' to see detailed user analysis")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Check errors above.")

if __name__ == "__main__":
    main()
