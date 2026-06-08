package com.proctoring.controllers;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.proctoring.dao.AuthDAO;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins="*") // Allows your frontend to talk to the backend during local dev
public class AuthController {
    
    private AuthDAO authDAO=new AuthDAO();

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String,String> credentials) {
        String role=credentials.get("role");
        String username=credentials.get("username");
        String password=credentials.get("password");
        
        boolean isValid=false;
        int userId=1; // In a real app, your DAO would return the actual user ID

        if(role.equals("admin")) {
            isValid=authDAO.loginAdmin(username,password);
        } else if(role.equals("teacher")) {
            isValid=authDAO.loginTeacher(username,password);
        } else if(role.equals("student")) {
            isValid=authDAO.loginStudent(username,password);
        }

        if(isValid) {
            return ResponseEntity.ok(Map.of("userId",userId,"role",role));
        } else {
            return ResponseEntity.status(401).body("Invalid credentials");
        }
    }
}