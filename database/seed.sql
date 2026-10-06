INSERT INTO organization_types (name, description) VALUES
('Company', 'Business enterprise'),
('School', 'Educational institution'),
('College', 'Higher education institution'),
('Hospital', 'Healthcare organization'),
('Government', 'Public sector organization'),
('NGO', 'Non-profit organization');

INSERT INTO resource_types (name, description) VALUES
('Meeting Room', 'Conference and team meeting spaces'),
('Conference Room', 'Executive or board meeting room'),
('Projector', 'Display and presentation equipment'),
('Laboratory', 'Research and testing equipment area'),
('Vehicle', 'Fleet and transportation asset'),
('Equipment', 'General operational resource');

INSERT INTO organization_priorities (organization_id, priority_name, priority_level, description, is_active) VALUES
(1, 'Digital transformation', 'Critical', 'Technology modernization and automation.', 1),
(1, 'Patient care coverage', 'High', 'Ensuring health service coverage and availability.', 1),
(1, 'Research acceleration', 'High', 'Maintain innovation and strategic research capacity.', 1);
