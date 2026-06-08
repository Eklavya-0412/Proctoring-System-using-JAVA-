package com.proctoring.controllers;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.proctoring.dao.ExamDAO;

@RestController
@RequestMapping("/api/exams")
@CrossOrigin(origins="*")
public class ExamController {

    private ExamDAO examDAO=new ExamDAO();

    // ADMIN: Create Exam
    @PostMapping("/create")
    public ResponseEntity<?> createExam(@RequestBody Map<String,Object> payload) {
        int adminId=Integer.parseInt(String.valueOf(payload.get("adminId")));
        String title=(String)payload.get("title");
        
        int examId=examDAO.createExam(adminId,title);
        if(examId!=-1) {
            return ResponseEntity.ok(Map.of("examId",examId));
        }
        return ResponseEntity.status(500).body("Error creating exam");
    }

    // ADMIN: Add Question
    @PostMapping("/{examId}/questions")
    public ResponseEntity<?> addQuestion(@PathVariable int examId, @RequestBody Map<String,String> payload) {
        String questionText=payload.get("questionText");
        boolean success=examDAO.addQuestion(examId,questionText);
        
        if(success) {
            return ResponseEntity.ok("Question added");
        }
        return ResponseEntity.status(500).body("Error adding question");
    }

    // STUDENT: Fetch Question Paper
    @GetMapping("/{examId}/questions")
    public ResponseEntity<?> getQuestions(@PathVariable int examId) {
        Map<Integer,String> questions=examDAO.getQuestionsForStudent(examId);
        return ResponseEntity.ok(questions);
    }

    // STUDENT: Save Violation
    @PostMapping("/violation")
    public ResponseEntity<?> logViolation(@RequestBody Map<String,Object> payload) {
        int studentId = Integer.parseInt(String.valueOf(payload.get("studentId")));
        String violation = String.valueOf(payload.get("reason"));
        
        boolean success = examDAO.saveViolation(studentId, violation);
        if(success) {
            return ResponseEntity.ok("Violation saved");
        }
        return ResponseEntity.status(500).body("Error saving violation");
    }

    // STUDENT: Submit Answers
    @PostMapping("/submit")
    public ResponseEntity<?> submitExam(@RequestBody Map<String,Object> payload) {
        int examId=Integer.parseInt(String.valueOf(payload.get("examId")));
        int studentId=Integer.parseInt(String.valueOf(payload.get("studentId")));
        List<Map<String,String>> answers=(List<Map<String,String>>)payload.get("answers");

        boolean allSuccess=true;
        for(Map<String,String> ans : answers) {
            int questionId=Integer.parseInt(ans.get("questionId"));
            String answerText=ans.get("answerText");
            
            boolean success=examDAO.submitAnswer(examId,questionId,studentId,answerText);
            if(!success) {
                allSuccess=false;
            }
        }

        if(allSuccess) {
            return ResponseEntity.ok("Exam submitted successfully");
        }
        return ResponseEntity.status(500).body("Error submitting some answers");
    }
}