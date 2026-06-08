package com.proctoring.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.proctoring.utils.DatabaseConnection;

public class ExamDAO {

    public int createExam(int adminId, String title) {
        int examId=-1;
        String query="INSERT INTO exams(admin_id,title) VALUES(?,?)";
        
        try (Connection conn=DatabaseConnection.connect();
             PreparedStatement pstmt=conn.prepareStatement(query, Statement.RETURN_GENERATED_KEYS)) {
            
            pstmt.setInt(1,adminId);
            pstmt.setString(2,title);
            pstmt.executeUpdate();
            
            try (ResultSet rs=pstmt.getGeneratedKeys()) {
                if(rs.next()) {
                    examId=rs.getInt(1);
                }
            }
        } catch (SQLException e) {
            System.out.println("Error creating exam: "+e.getMessage());
        }
        return examId;
    }

    public boolean addQuestion(int examId, String questionText) {
        boolean success=false;
        String query="INSERT INTO questions(exam_id,question_text) VALUES(?,?)";
        
        try (Connection conn=DatabaseConnection.connect();
             PreparedStatement pstmt=conn.prepareStatement(query)) {
            
            pstmt.setInt(1,examId);
            pstmt.setString(2,questionText);
            
            int rows=pstmt.executeUpdate();
            if(rows>0) {
                success=true;
            }
        } catch (SQLException e) {
            System.out.println("Error adding question: "+e.getMessage());
        }
        return success;
    }

    public Map<Integer,String> getQuestionsForStudent(int examId) {
        Map<Integer,String> questions=new HashMap<>();
        String query="SELECT id,question_text FROM questions WHERE exam_id=?";
        
        try (Connection conn=DatabaseConnection.connect();
             PreparedStatement pstmt=conn.prepareStatement(query)) {
            
            pstmt.setInt(1,examId);
            
            try (ResultSet rs=pstmt.executeQuery()) {
                while(rs.next()) {
                    questions.put(rs.getInt("id"),rs.getString("question_text"));
                }
            }
        } catch (SQLException e) {
            System.out.println("Error fetching questions: "+e.getMessage());
        }
        return questions;
    }

    public boolean submitAnswer(int examId, int questionId, int studentId, String answerText) {
        boolean success=false;
        String query="INSERT INTO answers(exam_id,question_id,student_id,answer_text) VALUES(?,?,?,?)";
        
        try (Connection conn=DatabaseConnection.connect();
             PreparedStatement pstmt=conn.prepareStatement(query)) {
            
            pstmt.setInt(1,examId);
            pstmt.setInt(2,questionId);
            pstmt.setInt(3,studentId);
            pstmt.setString(4,answerText);
            
            int rows=pstmt.executeUpdate();
            if(rows>0) {
                success=true;
            }
        } catch (SQLException e) {
            System.out.println("Error submitting answer: "+e.getMessage());
        }
        return success;
    }

    public boolean saveViolation(int studentId, String violation) {
        boolean success = false;
        String query = "INSERT INTO student_violations(student_id, violation) VALUES(?, ?)";
        
        try (Connection conn = DatabaseConnection.connect();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setInt(1, studentId);
            pstmt.setString(2, violation);
            
            int rows = pstmt.executeUpdate();
            if (rows > 0) {
                success = true;
            }
        } catch (SQLException e) {
            System.out.println("Error saving violation: " + e.getMessage());
        }
        return success;
    }

    public List<Map<String,Object>> getAnswersForTeacher(int examId) {
        List<Map<String,Object>> answersList=new ArrayList<>();
        String query="SELECT answer_id,question_text,student_id,answer_text FROM teacher_grading_view WHERE exam_id=?";
        
        try (Connection conn=DatabaseConnection.connect();
             PreparedStatement pstmt=conn.prepareStatement(query)) {
            
            pstmt.setInt(1,examId);
            
            try (ResultSet rs=pstmt.executeQuery()) {
                while(rs.next()) {
                    Map<String,Object> row=new HashMap<>();
                    row.put("answer_id",rs.getInt("answer_id"));
                    row.put("question_text",rs.getString("question_text"));
                    row.put("student_id",rs.getInt("student_id")); 
                    row.put("answer_text",rs.getString("answer_text"));
                    answersList.add(row);
                }
            }
        } catch (SQLException e) {
            System.out.println("Error fetching answers for teacher: "+e.getMessage());
        }
        return answersList;
    }
}