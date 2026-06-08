package com.proctoring.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import com.proctoring.utils.DatabaseConnection;

public class AuthDAO {

    public boolean loginAdmin(String username, String password) {
        boolean isValid=false;
        String query="SELECT id FROM admins WHERE username=? AND password=?";
        
        try (Connection conn=DatabaseConnection.connect();
             PreparedStatement pstmt=conn.prepareStatement(query)) {
            
            pstmt.setString(1, username);
            pstmt.setString(2, password);
            
            try (ResultSet rs=pstmt.executeQuery()) {
                if(rs.next()) {
                    isValid=true;
                }
            }
        } catch (SQLException e) {
            System.out.println("Admin login error: "+e.getMessage());
        }
        return isValid;
    }

    public boolean loginTeacher(String username, String password) {
        boolean isValid=false;
        String query="SELECT id FROM teachers WHERE username=? AND password=?";
        
        try (Connection conn=DatabaseConnection.connect();
             PreparedStatement pstmt=conn.prepareStatement(query)) {
            
            pstmt.setString(1, username);
            pstmt.setString(2, password);
            
            try (ResultSet rs=pstmt.executeQuery()) {
                if(rs.next()) {
                    isValid=true;
                }
            }
        } catch (SQLException e) {
            System.out.println("Teacher login error: "+e.getMessage());
        }
        return isValid;
    }

    public boolean loginStudent(String username, String password) {
        boolean isValid=false;
        String query="SELECT id FROM students WHERE username=? AND password=?";
        
        try (Connection conn=DatabaseConnection.connect();
             PreparedStatement pstmt=conn.prepareStatement(query)) {
            
            pstmt.setString(1, username);
            pstmt.setString(2, password);
            
            try (ResultSet rs=pstmt.executeQuery()) {
                if(rs.next()) {
                    isValid=true;
                }
            }
        } catch (SQLException e) {
            System.out.println("Student login error: "+e.getMessage());
        }
        return isValid;
    }
}