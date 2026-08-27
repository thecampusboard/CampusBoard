-- ============================================================================
-- CampusBoard — seed data
-- Ports the demo content that used to live in src/lib/data.ts into Postgres,
-- keeping the same ids so existing routes (/notices/:id, /events/:id, …)
-- keep working unchanged. Run AFTER migrations 001 through 011.
--
-- buy_sell_listings is intentionally NOT seeded here: every row requires a
-- real owner_id referencing an authenticated Supabase user (auth.users), and
-- there's no such user until someone signs up. Post-signup, use the app's
-- own "Post an item" flow (or insert manually with a real user's id) to
-- create Buy & Sell rows — that also exercises the real approval workflow
-- instead of pre-seeding around it.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- clubs (seeded before events, since events.club_id references clubs)
-- ----------------------------------------------------------------------------
insert into public.clubs
  (id, name, tagline, about, accent, members, founded, recruitment, announcements, gallery, socials, past_events)
values
  ('robominds', 'Robominds', 'Robotics Club',
   'Robominds builds autonomous and combat robots, runs weekend hardware labs and represents the campus at national robotics championships.',
   'blue', 84, '2016', 'Recruitment opens every August. Written aptitude round followed by a build task.',
   array['RoboWars build slots are now open in Lab 2.', 'Arduino starter workshop for 1st years on 28 Aug.'],
   array['Line follower finals', 'Arena build day', 'National robotics meet'],
   '[{"label": "Instagram", "url": "https://instagram.com"}, {"label": "GitHub", "url": "https://github.com"}]',
   '[{"title": "Line Follower Championship", "date": "12 Mar 2026"}, {"title": "Drone Building Bootcamp", "date": "04 Feb 2026"}]'),

  ('cybersentinels', 'CyberSentinels', 'Cybersecurity Club',
   'A security-focused community running CTFs, secure coding sessions and awareness drives across departments.',
   'purple', 62, '2018', 'Rolling recruitment through the CTF qualifier round.',
   array['Code Clash 3.0 registrations close 31 Aug.'],
   array['Capture the flag night', 'Threat modelling session'],
   '[{"label": "Discord", "url": "https://discord.com"}]',
   '[{"title": "CTF Night 2.0", "date": "18 Apr 2026"}, {"title": "Secure Coding Bootcamp", "date": "22 Jan 2026"}]'),

  ('pratibimbh', 'Pratibimbh', 'Photography Club',
   'Campus storytellers documenting fests, sports and everyday life through photography and short film.',
   'yellow', 51, '2014', 'Portfolio-based auditions every semester.',
   array['Auditions on 20 Aug at the Auditorium.'],
   array['Monsoon photowalk', 'Fest coverage', 'Portrait series'],
   '[{"label": "Instagram", "url": "https://instagram.com"}]',
   '[{"title": "Monsoon Photowalk", "date": "09 Jul 2026"}, {"title": "Exhibition: Frames", "date": "15 Mar 2026"}]'),

  ('avishkarnam', 'Avishkarnam', 'Literary Club',
   'Debates, poetry slams, open mics and the campus magazine — everything words can do.',
   'pink', 73, '2012', 'Open house auditions in the first week of every semester.',
   array['Open Mic Night entries open until 29 Aug.'],
   array['Poetry slam', 'Magazine launch'],
   '[{"label": "Instagram", "url": "https://instagram.com"}]',
   '[{"title": "Inter-college Debate", "date": "20 Feb 2026"}, {"title": "Magazine Launch: Inkwell", "date": "05 Dec 2025"}]'),

  ('nss', 'NSS', 'National Service Scheme',
   'Community service unit running village outreach, health camps, cleanliness drives and donation programmes.',
   'green', 140, '2009', 'Open enrolment for all students at the start of the academic year.',
   array['Blood donation camp on 5 Sep at the Health Centre.'],
   array['Village outreach', 'Tree plantation drive'],
   '[{"label": "Website", "url": "https://example.edu/nss"}]',
   '[{"title": "Tree Plantation Drive", "date": "05 Jun 2026"}, {"title": "Rural Health Camp", "date": "11 Jan 2026"}]'),

  ('sports-council', 'Sports Council', 'Sports & Fitness',
   'Manages campus teams, inter-department leagues and the annual sports meet across 14 disciplines.',
   'orange', 210, '2005', 'Trials per sport, announced through notices.',
   array['Basketball trials on 20 Aug at the Sports Complex.'],
   array['Annual sports meet', 'Inter-department league'],
   '[{"label": "Instagram", "url": "https://instagram.com"}]',
   '[{"title": "Annual Sports Meet", "date": "28 Feb 2026"}, {"title": "Inter-department Cricket", "date": "14 Nov 2025"}]')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- notices
-- ----------------------------------------------------------------------------
insert into public.notices
  (id, title, description, category, department, years, semesters, date, file_type, file_label, external_url, featured, views)
values
  ('tcs-placement-drive', 'New Placement Drive by TCS',
   'TCS is conducting an on-campus placement drive for final year students. Registration closes 24 Aug. Bring two copies of your resume and college ID.',
   'Placement', 'Training & Placement Cell', array['4th Year'], array['Semester 7', 'Semester 8'],
   '2026-08-20', 'PDF', 'TCS_Drive_2026.pdf', null, true, 1840),

  ('end-sem-schedule', 'End Semester Exam Schedule Released',
   'The end semester examination timetable for all branches has been published. Check your department board for room allocation.',
   'Examination', 'Examination Cell', array['1st Year', '2nd Year', '3rd Year', '4th Year'],
   array['Semester 1', 'Semester 3', 'Semester 5', 'Semester 7'],
   '2026-08-19', 'PDF', 'EndSem_Timetable.pdf', null, true, 3120),

  ('cse-cyber-seminar', 'CSE Dept. Seminar on Cyber Security',
   'An industry seminar on modern threat modelling and secure coding practices, hosted by the Computer Science department.',
   'Department', 'Computer Science', array['2nd Year', '3rd Year', '4th Year'], array['Semester 3', 'Semester 5', 'Semester 7'],
   '2026-08-18', 'Link', null, 'https://example.edu/seminar', false, 640),

  ('library-timings', 'Library Timings Updated',
   'The central library will now remain open until 11:00 PM on weekdays during the examination period.',
   'General', 'Central Library', array['1st Year', '2nd Year', '3rd Year', '4th Year'], array[]::text[],
   '2026-08-18', 'Text', null, null, false, 910),

  ('hackathon-circular', 'Hackathon Registration Circular',
   'Guidelines and team formation rules for the inter-college hackathon season 2026. Teams of up to four students.',
   'Academic', 'Dean of Student Affairs', array['1st Year', '2nd Year', '3rd Year'], array['Semester 1', 'Semester 3', 'Semester 5'],
   '2026-08-16', 'PDF', 'Hackathon_Circular.pdf', null, false, 512),

  ('scholarship-forms', 'Merit Scholarship Forms Open',
   'Applications for the state merit scholarship are open for students with 8.5 CGPA and above.',
   'Academic', 'Accounts Office', array['2nd Year', '3rd Year'], array['Semester 3', 'Semester 5'],
   '2026-08-14', 'PDF', 'Scholarship_Form.pdf', null, false, 405)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- events
-- ----------------------------------------------------------------------------
insert into public.events
  (id, title, organizer, club_id, date, end_date, time, start_time, end_time, venue, description,
   eligibility, registration_deadline, registration_url, contact, accent, featured, views,
   register_clicks)
values
  ('technova-2k26', 'Technova 2K26', 'Students'' Technical Council', null,
   '2026-08-23', '2026-08-24', '09:00 AM – 06:00 PM', '09:00', '18:00', 'Main Campus',
   'The flagship two-day technical festival with 30+ events across robotics, coding, design and entrepreneurship.',
   'Open to all students with a valid college ID.', '2026-08-21',
   'https://example.edu/technova/register', 'technova@campus.edu', 'blue', true, 4210, 812),

  ('robowars', 'RoboWars', 'Robominds', 'robominds',
   '2026-08-26', null, '11:00 AM – 04:00 PM', '11:00', '16:00', 'Block C, Lab 2',
   'Combat robotics showdown. Build a bot within 8kg and battle it out in the arena across three weight classes.',
   'Teams of 2–5 students from any branch.', '2026-08-24',
   'https://example.edu/robowars/register', null, 'orange', false, 1980, 402),

  ('open-mic-night', 'Open Mic Night', 'Avishkarnam', 'avishkarnam',
   '2026-08-30', null, '07:00 PM – 09:30 PM', '19:00', '21:30', 'Amphitheatre',
   'Poetry, stand-up, music and storytelling. Five minutes on stage, all genres welcome.',
   'Open to all students and faculty.', null,
   'https://example.edu/openmic/register', null, 'pink', false, 1150, 260),

  ('code-clash-3', 'Code Clash 3.0', 'CyberSentinels', 'cybersentinels',
   '2026-09-02', null, '10:00 AM – 02:00 PM', '10:00', '14:00', 'Computer Center',
   'A three-round competitive programming contest with algorithmic problems and a final debugging sprint.',
   'Individual participation, 1st–4th year.', '2026-08-31',
   'https://example.edu/codeclash/register', null, 'purple', false, 1620, 388),

  ('ai-workshop', 'AI Workshop', 'Computer Science Department', null,
   '2026-08-20', null, '10:00 AM – 12:30 PM', '10:00', '12:30', 'Block A, Seminar Hall',
   'Hands-on session on building and deploying small language model applications. Bring your laptop.',
   '2nd year and above.', null,
   'https://example.edu/ai-workshop/register', null, 'sky', false, 880, 190),

  ('photography-auditions', 'Photography Club Auditions', 'Pratibimbh', 'pratibimbh',
   '2026-08-20', null, '02:00 PM – 04:00 PM', '14:00', '16:00', 'Auditorium',
   'Walk in with a portfolio of five photographs. Shortlisted students join the core team.',
   '1st and 2nd year students.', null,
   'https://example.edu/pratibimbh/auditions', null, 'yellow', false, 540, 120),

  ('basketball-trials', 'Basketball Trials', 'Sports Council', 'sports-council',
   '2026-08-20', null, '05:00 PM – 07:00 PM', '17:00', '19:00', 'Sports Complex',
   'Selection trials for the inter-college basketball squad. Report 20 minutes early.',
   'All students, sports kit mandatory.', null,
   'https://example.edu/sports/basketball', null, 'green', false, 470, 96),

  ('blood-donation-camp', 'Blood Donation Camp', 'NSS', 'nss',
   '2026-09-05', null, '09:00 AM – 03:00 PM', '09:00', '15:00', 'Health Centre',
   'Annual blood donation drive in collaboration with the district hospital.',
   'Students and staff above 18 years.', null,
   'https://example.edu/nss/blood-camp', null, 'pink', false, 320, 88)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- opportunities
-- ----------------------------------------------------------------------------
insert into public.opportunities
  (id, title, organization, position, type, location, eligibility, years_branches, description,
   skills, stipend, deadline, apply_url, accent, featured, views, apply_clicks)
values
  ('microsoft-internship-2026', 'Microsoft Internship 2026', 'Microsoft', 'Software Engineering Intern', 'Internship',
   'Hyderabad, India · Hybrid', 'CGPA 7.5+, no active backlogs', '3rd year · CSE, IT, ECE',
   'A 10-week summer internship working with a product team on real features, with a mentor and an end-of-term project review.',
   array['Data Structures', 'C#/Java/Python', 'System Design basics'], '₹80,000 / month', '2026-08-28',
   'https://careers.microsoft.com', 'blue', true, 5210, 1204),

  ('google-summer-internship', 'Google Summer Internship', 'Google', 'Student Research Intern', 'Research',
   'Bengaluru, India · On-site', 'CGPA 8.0+, prior research or open-source work preferred', '3rd & 4th year · CSE, Maths',
   'Work alongside research scientists on applied machine learning problems and co-author an internal technical report.',
   array['Python', 'Machine Learning', 'Research writing'], '₹1,00,000 / month', '2026-09-05',
   'https://careers.google.com', 'green', false, 4120, 990),

  ('amazon-fresher-hiring', 'Amazon Fresher Hiring 2026', 'Amazon', 'SDE — New Grad', 'Job',
   'Bengaluru / Chennai', 'Graduating batch of 2026, CGPA 7.0+', '4th year · All engineering branches',
   'Full-time software development engineer role across retail, AWS and devices organisations.',
   array['Algorithms', 'Object-oriented design', 'Distributed systems'], '₹22 LPA CTC', '2026-09-10',
   'https://amazon.jobs', 'orange', false, 6300, 1580),

  ('national-coding-hackathon', 'National Coding Hackathon', 'TechFront India', 'Participant', 'Hackathon',
   'Online · 36 hours', 'Teams of 2–4 undergraduate students', 'All years · All branches',
   'A 36-hour national hackathon on civic technology with a ₹3,00,000 prize pool and mentor office hours.',
   array['Full-stack', 'APIs', 'Product thinking'], null, '2026-09-12',
   'https://example.org/hackathon', 'purple', false, 2210, 480),

  ('iisc-research-fellowship', 'IISc Summer Research Fellowship', 'Indian Institute of Science', 'Research Fellow', 'Fellowship',
   'Bengaluru · On-site', 'CGPA 8.5+, strong statement of purpose', '2nd & 3rd year · Science and engineering',
   'Eight-week fellowship in a host lab with a stipend, hostel accommodation and a final poster presentation.',
   array['Research methods', 'Lab work', 'Technical writing'], '₹20,000 / month', '2026-09-18',
   'https://iisc.ac.in/fellowship', 'sky', false, 1420, 310),

  ('design-sprint-workshop', 'Product Design Sprint Workshop', 'DesignLab', 'Attendee', 'Workshop',
   'Campus · Block B Studio', 'Open to all students', 'All years · All branches',
   'A two-day workshop on running design sprints, from problem framing to a clickable prototype.',
   array['Figma', 'User research', 'Prototyping'], null, '2026-08-30',
   'https://example.org/design-sprint', 'pink', false, 860, 175)
on conflict (id) do nothing;
