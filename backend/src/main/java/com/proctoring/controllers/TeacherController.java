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
@RequestMapping("/api/teacher")
@CrossOrigin(origins="*")
public class TeacherController {

    private ExamDAO examDAO=new ExamDAO();

    // TEACHER: Fetch Anonymous Answers
    @GetMapping("/answers/{examId}")
    public ResponseEntity<?> getAnswers(@PathVariable int examId) {
        List<Map<String,Object>> answers=examDAO.getAnswersForTeacher(examId);
        return ResponseEntity.ok(answers);
    }

    // TEACHER: Save Grades
    @PostMapping("/grades/save")
    public ResponseEntity<?> saveGrades(@RequestBody List<Map<String,Object>> grades) {
        // Here you would loop through the grades array and save them to a 'grades' database table
        // Example: for(Map<String,Object> grade : grades) { ... }
        
        return ResponseEntity.ok("Grades saved successfully");
    }
}