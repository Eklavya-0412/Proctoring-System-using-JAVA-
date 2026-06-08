import sqlite3
import os

# Define paths
db_path="database/proctoring.db"
schema_path="database/schema.sql"

# Ensure the database directory exists
os.makedirs("database",exist_ok=True)

# Connect to the database (this creates the file if it doesn't exist)
conn=sqlite3.connect(db_path)
cursor=conn.cursor()

# Read the schema.sql file
with open(schema_path,'r') as file:
    schema_script=file.read()

# Execute the SQL script to create tables and views
cursor.executescript(schema_script)

# Insert dummy data so you can test the login pages immediately
cursor.execute("INSERT OR IGNORE INTO admins(username,password) VALUES('admin','admin123')")
cursor.execute("INSERT OR IGNORE INTO teachers(username,password) VALUES('teacher','teacher123')")
cursor.execute("INSERT OR IGNORE INTO students(name,username,password) VALUES('John Doe','student','student123')")

# Insert a test exam with questions so the student portal works out of the box
cursor.execute("INSERT OR IGNORE INTO exams(id,admin_id,title) VALUES(1,1,'Computer Science Midterm')")

# Only seed questions if exam 1 has none (avoids duplicates on re-run)
cursor.execute("SELECT COUNT(*) FROM questions WHERE exam_id=1")
if cursor.fetchone()[0] == 0:
    cursor.execute("INSERT INTO questions(exam_id,question_text) VALUES(1,'What is the time complexity of binary search?')")
    cursor.execute("INSERT INTO questions(exam_id,question_text) VALUES(1,'Explain the difference between an interface and an abstract class in Java.')")
    print("Seeded 2 test questions for exam 1.")

# Save changes and close the connection
conn.commit()
conn.close()

print("Database initialized successfully with test accounts!")