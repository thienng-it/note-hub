/**
 * Real-time password validation for registration and password reset forms
 * This module provides live feedback on password requirements
 */

function initPasswordValidation(passwordFieldId) {
    const passwordField = document.getElementById(passwordFieldId);
    if (!passwordField) return;
    
    // Create validation feedback element
    const validationDiv = document.createElement('div');
    validationDiv.className = 'mt-2 text-xs space-y-1';
    validationDiv.id = `${passwordFieldId}-validation`;
    passwordField.parentElement.parentElement.appendChild(validationDiv);
    
    function validatePassword(password) {
        const requirements = [
            { test: password.length >= 12, label: 'At least 12 characters', icon: 'fa-check-circle', iconFail: 'fa-times-circle' },
            { test: /[a-z]/.test(password), label: 'One lowercase letter', icon: 'fa-check-circle', iconFail: 'fa-times-circle' },
            { test: /[A-Z]/.test(password), label: 'One uppercase letter', icon: 'fa-check-circle', iconFail: 'fa-times-circle' },
            { test: /[0-9]/.test(password), label: 'One number', icon: 'fa-check-circle', iconFail: 'fa-times-circle' },
            { test: /[^a-zA-Z0-9]/.test(password), label: 'One special character', icon: 'fa-check-circle', iconFail: 'fa-times-circle' },
            { test: !/\s/.test(password), label: 'No whitespace', icon: 'fa-check-circle', iconFail: 'fa-times-circle' }
        ];
        
        let html = '';
        requirements.forEach(req => {
            const passed = req.test;
            const color = passed ? 'text-green-600' : 'text-gray-400';
            const icon = passed ? req.icon : req.iconFail;
            html += `<div class="${color} flex items-center"><i class="fas ${icon} mr-2"></i>${req.label}</div>`;
        });
        
        validationDiv.innerHTML = html;
        return requirements.every(req => req.test);
    }
    
    passwordField.addEventListener('input', function() {
        if (this.value.length > 0) {
            validatePassword(this.value);
        } else {
            validationDiv.innerHTML = '';
        }
    });
}

// Auto-initialize on DOMContentLoaded if not already initialized
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Check if password field exists and initialize
        if (document.getElementById('password')) {
            initPasswordValidation('password');
        }
    });
} else {
    // DOM is already ready
    if (document.getElementById('password')) {
        initPasswordValidation('password');
    }
}
