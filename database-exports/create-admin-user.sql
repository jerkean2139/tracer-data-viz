-- Create Admin User for Production
-- Username: Admin
-- Password: Admin@123

INSERT INTO users (
    id,
    username,
    password_hash,
    first_name,
    last_name,
    role,
    auth_type,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Admin',
    '$2b$10$gi7RzyHWIGLpAlaS9sV4JO9QK61AUkPu3JyMxQJywPH89gPdGwoNy',
    'Admin',
    'User',
    'admin',
    'local',
    NOW(),
    NOW()
)
ON CONFLICT (username) DO NOTHING;
