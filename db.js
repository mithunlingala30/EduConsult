const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  phone TEXT DEFAULT '',
  qualification TEXT DEFAULT '',
  percentage REAL DEFAULT 0,
  interest TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS colleges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  type TEXT NOT NULL,
  courses TEXT NOT NULL,
  fees INTEGER NOT NULL,
  rating REAL DEFAULT 4.0,
  established INTEGER DEFAULT 2000,
  seats INTEGER DEFAULT 100,
  deadline TEXT DEFAULT '',
  min_percentage INTEGER DEFAULT 60,
  description TEXT DEFAULT '',
  highlights TEXT DEFAULT '',
  featured INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  course TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Submitted',
  statement TEXT DEFAULT '',
  admin_note TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  topic TEXT NOT NULL,
  date TEXT NOT NULL,
  slot TEXT NOT NULL,
  mode TEXT DEFAULT 'Online',
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

function seed() {
  const hasUsers = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (!hasUsers) {
    const ins = db.prepare('INSERT INTO users (name,email,password,role,phone,qualification,percentage,interest) VALUES (?,?,?,?,?,?,?,?)');
    ins.run('Admin', 'admin@educonsult.com', bcrypt.hashSync('admin123', 10), 'admin', '+91 90000 00000', '', 0, '');
    ins.run('Aarav Sharma', 'student@educonsult.com', bcrypt.hashSync('student123', 10), 'student', '+91 98765 43210', '12th - Science', 88, 'Engineering');
  }
  const hasColleges = db.prepare('SELECT COUNT(*) c FROM colleges').get().c;
  if (!hasColleges) {
    const ins = db.prepare(`INSERT INTO colleges (name,city,state,type,courses,fees,rating,established,seats,deadline,min_percentage,description,highlights,featured)
      VALUES (@name,@city,@state,@type,@courses,@fees,@rating,@established,@seats,@deadline,@min_percentage,@description,@highlights,@featured)`);
    const rows = [
      { name: 'Meridian Institute of Technology', city: 'Chennai', state: 'Tamil Nadu', type: 'Engineering', courses: 'B.Tech CSE,B.Tech ECE,B.Tech Mechanical,M.Tech AI', fees: 185000, rating: 4.7, established: 1987, seats: 900, deadline: '2027-05-30', min_percentage: 75, featured: 1,
        description: 'A research-driven engineering institute with strong industry partnerships, modern labs and a vibrant innovation incubator.', highlights: '95% placement rate,Industry-sponsored labs,Global exchange programs,Startup incubator' },
      { name: 'Crestwood School of Management', city: 'Bengaluru', state: 'Karnataka', type: 'Management', courses: 'BBA,MBA,MBA Finance,PGDM', fees: 320000, rating: 4.6, established: 1995, seats: 420, deadline: '2027-04-15', min_percentage: 65, featured: 1,
        description: 'A case-method business school known for leadership development, corporate immersion and a powerful alumni network.', highlights: 'Top recruiters visit campus,Live consulting projects,Dedicated career office,Alumni mentorship' },
      { name: 'Aurora Medical College', city: 'Pune', state: 'Maharashtra', type: 'Medical', courses: 'MBBS,BDS,B.Sc Nursing,BPT', fees: 540000, rating: 4.8, established: 1979, seats: 250, deadline: '2027-06-10', min_percentage: 85, featured: 1,
        description: 'A teaching hospital-backed medical college with extensive clinical exposure and experienced faculty.', highlights: '900-bed teaching hospital,Simulation labs,Rural health programs,Research fellowships' },
      { name: 'Lakeview University of Arts & Science', city: 'Hyderabad', state: 'Telangana', type: 'Arts & Science', courses: 'B.Sc Data Science,B.A Psychology,B.Com Honours,M.Sc Physics', fees: 95000, rating: 4.4, established: 2001, seats: 1200, deadline: '2027-06-30', min_percentage: 55, featured: 1,
        description: 'A multidisciplinary university offering a flexible credit system and a green, student-friendly campus.', highlights: 'Choice-based credits,Research internships,Language lab,Sports complex' },
      { name: 'Northgate Law Academy', city: 'Delhi', state: 'Delhi', type: 'Law', courses: 'BA LLB,BBA LLB,LLM Corporate Law', fees: 260000, rating: 4.5, established: 1990, seats: 240, deadline: '2027-05-05', min_percentage: 70, featured: 0,
        description: 'A premier law school with moot court excellence and strong ties to leading law firms and courts.', highlights: 'Moot court society,Legal aid clinic,Law firm internships,Visiting judges' },
      { name: 'Harbor Design & Architecture Institute', city: 'Mumbai', state: 'Maharashtra', type: 'Design', courses: 'B.Des Product,B.Arch,M.Des Interaction,B.Des Fashion', fees: 275000, rating: 4.5, established: 2004, seats: 300, deadline: '2027-04-25', min_percentage: 60, featured: 0,
        description: 'A studio-first design institute where portfolios matter more than percentages.', highlights: 'Studio-based learning,Portfolio mentoring,Global workshops,Design fest' },
      { name: 'Silverline College of Engineering', city: 'Coimbatore', state: 'Tamil Nadu', type: 'Engineering', courses: 'B.E CSE,B.E EEE,B.E Civil,B.E IT', fees: 120000, rating: 4.2, established: 1998, seats: 720, deadline: '2027-06-20', min_percentage: 60, featured: 0,
        description: 'An affordable engineering college with dedicated placement training and practical labs.', highlights: 'Placement training from year 1,Industry visits,Hackathon club,Scholarships for toppers' },
      { name: 'Everbright Institute of Pharmacy', city: 'Ahmedabad', state: 'Gujarat', type: 'Pharmacy', courses: 'B.Pharm,Pharm.D,M.Pharm', fees: 150000, rating: 4.3, established: 1992, seats: 180, deadline: '2027-06-01', min_percentage: 65, featured: 0,
        description: 'A pharmacy institute with strong research output and pharma industry placements.', highlights: 'Modern research labs,Pharma industry tie-ups,Hospital training,Research grants' },
      { name: 'Summit University of Commerce', city: 'Kolkata', state: 'West Bengal', type: 'Management', courses: 'B.Com,BBA,M.Com,CA Integrated', fees: 80000, rating: 4.1, established: 1985, seats: 900, deadline: '2027-07-05', min_percentage: 50, featured: 0,
        description: 'A heritage commerce university with a strong CA and finance foundation.', highlights: 'CA coaching integration,Stock market lab,Corporate guest lectures,Low fee structure' },
      { name: 'Pinnacle Institute of Hotel Management', city: 'Goa', state: 'Goa', type: 'Hospitality', courses: 'BHM,B.Sc Culinary Arts,MHM', fees: 210000, rating: 4.4, established: 2006, seats: 160, deadline: '2027-05-18', min_percentage: 55, featured: 0,
        description: 'Learn hospitality in a real-world resort setting with international internships.', highlights: 'Training restaurant,International internships,Chef mentors,Hotel partnerships' },
      { name: 'Vertex Institute of AI & Data Sciences', city: 'Bengaluru', state: 'Karnataka', type: 'Engineering', courses: 'B.Tech AI & ML,B.Tech Data Science,M.Tech Robotics', fees: 295000, rating: 4.6, established: 2015, seats: 360, deadline: '2027-05-12', min_percentage: 78, featured: 1,
        description: 'A new-age institute focused entirely on AI, data and robotics with GPU compute labs.', highlights: 'GPU compute cluster,Industry capstone projects,Research with startups,Global AI summit' },
      { name: 'Greenfield Agricultural University', city: 'Ludhiana', state: 'Punjab', type: 'Agriculture', courses: 'B.Sc Agriculture,B.Tech Food Technology,M.Sc Agronomy', fees: 70000, rating: 4.0, established: 1975, seats: 500, deadline: '2027-06-25', min_percentage: 55, featured: 0,
        description: 'A leading agricultural university with large research farms and agri-tech initiatives.', highlights: 'Research farms,Agri-tech incubator,Field training,Government scholarships' }
    ];
    const tx = db.transaction(list => list.forEach(r => ins.run(r)));
    tx(rows);

    // sample records so dashboards look alive
    db.prepare("INSERT INTO applications (user_id,college_id,course,status,statement) VALUES (2,1,'B.Tech CSE','Under Review','Passionate about software engineering and open-source.')").run();
    db.prepare("INSERT INTO applications (user_id,college_id,course,status,statement) VALUES (2,11,'B.Tech AI & ML','Submitted','Interested in machine learning research.')").run();
    db.prepare("INSERT INTO consultations (user_id,name,email,phone,topic,date,slot,mode,status) VALUES (2,'Aarav Sharma','student@educonsult.com','+91 98765 43210','Course Selection','2026-12-02','11:00 AM','Online','Confirmed')").run();
  }
}
seed();

module.exports = db;
