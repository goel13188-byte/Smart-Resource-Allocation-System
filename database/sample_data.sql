-- Sample/demo data for the Smart Resource Allocation System.
-- The application seeds this data when the MySQL database is available and empty.

INSERT INTO organization_types (name, description) VALUES
('Company', 'Business enterprise'),
('School', 'Learning and instruction organization'),
('College', 'Universities and colleges'),
('Hospital', 'Healthcare institution'),
('Government', 'Public sector organization'),
('NGO', 'Non-profit organization');

INSERT INTO resource_types (name, description) VALUES
('Meeting Room', 'General meeting room for sessions and reviews'),
('Projector', 'Presentation equipment'),
('Laboratory', 'Technical or research equipment'),
('Vehicle', 'Transportation resource'),
('Conference Room', 'Boardroom and executive meeting space'),
('Equipment', 'General operating asset');
