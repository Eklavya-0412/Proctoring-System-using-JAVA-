package com.proctoring.utils;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.io.File;

public class DatabaseConnection {
    public static Connection connect() {
    Connection conn = null;
    try {
        Class.forName("org.sqlite.JDBC");

        // Triple-check logic for different working directories
        String[] possiblePaths = {
            "database/proctoring.db",                       // If running from ProctoringSystem/
            "ProctoringSystem/database/proctoring.db",      // If running from Final_Project/
            "../database/proctoring.db"                      // If running from backend/
        };

        String dbPath = null;
        for (String path : possiblePaths) {
            if (new File(path).exists()) {
                dbPath = path;
                break;
            }
        }

        if (dbPath == null) {
            System.out.println("CRITICAL: Database file not found in any expected location!");
            return null;
        }

        String url = "jdbc:sqlite:" + dbPath;
        conn = DriverManager.getConnection(url);
        
        // This will print in your terminal so you can see exactly which one it found
        System.out.println("SUCCESS: Connected to database at: " + new File(dbPath).getAbsolutePath());

    } catch (SQLException | ClassNotFoundException e) {
        System.out.println("Connection failed: " + e.getMessage());
    }
    return conn;
}

    public static void main(String[] args) {
        Connection testConn = connect();
        if (testConn != null) {
            try {
                testConn.close();
                System.out.println("Connection closed successfully.");
            } catch (SQLException e) {
                System.out.println(e.getMessage());
            }
        }
    }
}