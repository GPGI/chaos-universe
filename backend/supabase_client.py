import config

# Initialize Supabase client with service role key (backend only!)
# Supabase is optional - only initialize if configured
supabase = None
if hasattr(config, 'SUPABASE_URL') and hasattr(config, 'SUPABASE_KEY'):
    if config.SUPABASE_URL and config.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
        except Exception as e:
            print(f"Warning: Failed to initialize Supabase client: {e}")
            supabase = None

def get_users():
    """Return all users from Supabase 'users' table."""
    if supabase is None:
        raise Exception("Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY environment variables.")
    response = supabase.table("users").select("*").execute()
    if response.error:
        raise Exception(f"Supabase error: {response.error}")
    return response.data

def add_user(user_data: dict):
    """Add a new user to Supabase."""
    if supabase is None:
        raise Exception("Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY environment variables.")
    response = supabase.table("users").insert(user_data).execute()
    if response.error:
        raise Exception(f"Supabase error: {response.error}")
    return response.data
