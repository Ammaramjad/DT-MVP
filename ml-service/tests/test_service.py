"""
ML Service Test Script

Simple script to test ML service functionality without full dependencies.
Run this after installing requirements to verify the service works correctly.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def test_imports():
    """Test that all modules can be imported."""
    print("Testing imports...")
    
    try:
        from app.config import settings
        print(f"✓ Config loaded - Environment: {settings.environment}")
        
        from app.models.forecasting import ProphetForecaster, ARIMAForecaster
        print("✓ Forecasting models imported")
        
        from app.models.anomaly import IsolationForestDetector
        print("✓ Anomaly detection model imported")
        
        from app.models.simulation import ElasticNetSimulator
        print("✓ Simulation model imported")
        
        from app.api.forecast import router as forecast_router
        from app.api.anomaly import router as anomaly_router
        from app.api.simulation import router as simulation_router
        print("✓ API routers imported")
        
        from app.services.model_service import save_model, load_model
        from app.services.training_service import train_forecast_model
        print("✓ Services imported")
        
        from app.utils.preprocessing import preprocess_time_series
        from app.utils.evaluation import evaluate_forecast
        print("✓ Utilities imported")
        
        print("\n✅ All imports successful!")
        return True
        
    except Exception as e:
        print(f"\n❌ Import failed: {e}")
        return False


def test_configuration():
    """Test configuration loading."""
    print("\nTesting configuration...")
    
    try:
        from app.config import settings
        
        print(f"  Service name: {settings.service_name}")
        print(f"  Model storage: {settings.model_storage_path}")
        print(f"  Prophet changepoint prior: {settings.prophet_changepoint_prior_scale}")
        print(f"  Isolation forest contamination: {settings.isolation_forest_contamination}")
        print(f"  Simulation alpha: {settings.simulation_alpha}")
        
        print("\n✅ Configuration loaded successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Configuration test failed: {e}")
        return False


def test_model_storage():
    """Test model storage directory creation."""
    print("\nTesting model storage...")
    
    try:
        from app.config import settings
        
        storage_path = settings.model_storage_path
        
        if storage_path.exists():
            print(f"  Storage path exists: {storage_path}")
        else:
            print(f"  Creating storage path: {storage_path}")
            storage_path.mkdir(parents=True, exist_ok=True)
        
        # Test subdirectories
        for model_type in ['forecast', 'anomaly', 'simulation']:
            type_path = storage_path / model_type
            type_path.mkdir(parents=True, exist_ok=True)
            print(f"  ✓ {model_type} directory ready")
        
        print("\n✅ Model storage ready!")
        return True
        
    except Exception as e:
        print(f"\n❌ Model storage test failed: {e}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("ML Service Test Suite")
    print("=" * 60)
    
    results = []
    
    # Run tests
    results.append(("Imports", test_imports()))
    results.append(("Configuration", test_configuration()))
    results.append(("Model Storage", test_model_storage()))
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n🎉 All tests passed! ML service is ready.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
