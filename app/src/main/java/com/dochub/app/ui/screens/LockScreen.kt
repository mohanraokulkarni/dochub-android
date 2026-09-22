package com.dochub.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dochub.app.security.AppLockManager
import com.dochub.app.ui.viewmodel.DocHubViewModel

@Composable
fun LockScreen(viewModel: DocHubViewModel) {
    val lockMode by viewModel.lockMode.collectAsState()
    var pinInput by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                Icons.Default.Lock,
                contentDescription = "App Locked",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(64.dp)
            )

            Spacer(Modifier.height(16.dp))

            Text(
                "DocHub is Locked",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )

            Text(
                "Personal offline encrypted vault",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(Modifier.height(32.dp))

            if (lockMode == AppLockManager.MODE_PIN) {
                OutlinedTextField(
                    value = pinInput,
                    onValueChange = {
                        if (it.length <= 6) {
                            pinInput = it
                            errorMessage = null
                            if (it.length >= 4) {
                                val ok = viewModel.unlockWithPin(it)
                                if (!ok && it.length == 6) {
                                    errorMessage = "Incorrect PIN. Please try again."
                                }
                            }
                        }
                    },
                    label = { Text("Enter PIN") },
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(0.7f),
                    shape = RoundedCornerShape(12.dp),
                    isError = errorMessage != null
                )

                errorMessage?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                }

                Spacer(Modifier.height(16.dp))

                Button(
                    onClick = {
                        val ok = viewModel.unlockWithPin(pinInput)
                        if (!ok) {
                            errorMessage = "Incorrect PIN"
                        }
                    },
                    modifier = Modifier.fillMaxWidth(0.7f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Unlock")
                }
            } else if (lockMode == AppLockManager.MODE_BIOMETRIC) {
                Button(
                    onClick = {
                        // In Android runtime with BiometricPrompt
                        viewModel.unlockWithBiometric()
                    },
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Fingerprint, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Unlock with Biometrics")
                }
            }
        }
    }
}
