package in.studyguru.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Note
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.GoTrue
import io.github.jan.supabase.gotrue.handleDeeplinks
import io.github.jan.supabase.gotrue.providers.Google
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.gotrue.gotrue
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.decodeList
import io.github.jan.supabase.storage.Storage
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

private val Coral = Color(0xFFFF6148)
private val Ink = Color(0xFF1F2633)
private val Paper = Color(0xFFFFFFFF)
private const val SUPABASE_URL = "https://mdzkwgtrhoklmapkjhhf.supabase.co"
private const val SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7FxlPBdcgKAb0ZypW-iB9w_-SyW3TWd"

private val supabase = createSupabaseClient(
    supabaseUrl = SUPABASE_URL,
    supabaseKey = SUPABASE_PUBLISHABLE_KEY
) {
    install(GoTrue) {
        scheme = "studyguru"
        host = "login-callback"
    }
    install(Postgrest)
    install(Storage)
}

@Serializable
data class CourseRow(
    val id: String,
    val title: String,
    @SerialName("class_name") val className: String,
    val subject: String,
    val description: String? = null,
    @SerialName("is_published") val isPublished: Boolean = false
)

@Serializable
data class LiveClassRow(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("class_name") val className: String,
    val subject: String,
    @SerialName("instructor_name") val instructorName: String? = null,
    @SerialName("starts_at") val startsAt: String,
    @SerialName("join_url") val joinUrl: String,
    @SerialName("is_published") val isPublished: Boolean = false
)

@Serializable
data class TestRow(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("class_name") val className: String,
    val subject: String,
    @SerialName("duration_minutes") val durationMinutes: Int = 15,
    @SerialName("is_published") val isPublished: Boolean = false
)

@Serializable
data class MaterialRow(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("material_type") val materialType: String,
    @SerialName("external_url") val externalUrl: String? = null,
    @SerialName("storage_bucket") val storageBucket: String,
    @SerialName("storage_path") val storagePath: String,
    @SerialName("is_published") val isPublished: Boolean = false
)

@Serializable
data class NoteRow(
    val id: String,
    val title: String,
    val body: String,
    val subject: String? = null,
    val chapter: String? = null
)

@Serializable
data class ProfileRow(
    val id: String,
    @SerialName("full_name") val fullName: String? = null,
    val role: String = "student"
)

@Serializable
data class AttemptRow(
    val id: String,
    val score: Int,
    @SerialName("total_questions") val totalQuestions: Int,
    @SerialName("submitted_at") val submittedAt: String
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        supabase.handleDeeplinks(intent)
        setContent { StudyGuruApp() }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        supabase.handleDeeplinks(intent)
    }
}

@androidx.compose.runtime.Composable
private fun StudyGuruApp() {
    var hindi by remember { mutableStateOf(true) }
    var tab by remember { mutableIntStateOf(0) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var signedIn by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var courses by remember { mutableStateOf<List<CourseRow>>(emptyList()) }
    var liveClasses by remember { mutableStateOf<List<LiveClassRow>>(emptyList()) }
    var tests by remember { mutableStateOf<List<TestRow>>(emptyList()) }
    var materials by remember { mutableStateOf<List<MaterialRow>>(emptyList()) }
    var notes by remember { mutableStateOf<List<NoteRow>>(emptyList()) }
    var profile by remember { mutableStateOf<ProfileRow?>(null) }
    var attempts by remember { mutableStateOf<List<AttemptRow>>(emptyList()) }
    val scope = rememberCoroutineScope()

    fun refreshData() {
        scope.launch {
            loading = true
            message = ""
            try {
                courses = runCatching {
                    supabase.from("courses").select().decodeList<CourseRow>().filter { it.isPublished }
                }.getOrDefault(emptyList())
                liveClasses = runCatching {
                    supabase.from("live_classes").select().decodeList<LiveClassRow>().filter { it.isPublished }
                }.getOrDefault(emptyList())
                tests = runCatching {
                    supabase.from("practice_tests").select().decodeList<TestRow>().filter { it.isPublished }
                }.getOrDefault(emptyList())
                materials = runCatching {
                    supabase.from("learning_materials").select().decodeList<MaterialRow>().filter { it.isPublished }
                }.getOrDefault(emptyList())

                val userId = runCatching { supabase.gotrue.currentUserOrNull()?.id }.getOrNull()
                if (userId != null) {
                    signedIn = true
                    profile = runCatching {
                        supabase.from("profiles").select().decodeList<ProfileRow>().firstOrNull { it.id == userId }
                    }.getOrNull()
                    notes = runCatching {
                        supabase.from("student_notes").select().decodeList<NoteRow>()
                    }.getOrDefault(emptyList())
                    attempts = runCatching {
                        supabase.from("test_attempts").select().decodeList<AttemptRow>()
                    }.getOrDefault(emptyList())
                }
            } catch (e: Exception) {
                message = e.message ?: "Data could not be loaded."
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { refreshData() }

    val labels = if (hindi) listOf("होम", "कोर्स", "सामग्री", "टेस्ट", "लाइव", "नोट्स", "प्रोफाइल")
                 else listOf("Home", "Courses", "Materials", "Tests", "Live", "Notes", "Profile")
    val icons = listOf(Icons.Filled.Home, Icons.Filled.Book, Icons.Filled.Book, Icons.Filled.Quiz, Icons.Filled.LiveTv, Icons.Filled.Note, Icons.Filled.Person)

    MaterialTheme(colorScheme = lightColorScheme(
        primary = Coral,
        onPrimary = Paper,
        background = Color(0xFFF7F7F8),
        surface = Paper,
        onSurface = Ink
    )) {
        Scaffold(
            containerColor = Color(0xFFF7F7F8),
            bottomBar = {
                NavigationBar(containerColor = Paper) {
                    labels.forEachIndexed { index, label ->
                        NavigationBarItem(
                            selected = tab == index,
                            onClick = { tab = index },
                            icon = { Icon(icons[index], contentDescription = label) },
                            label = { Text(label, maxLines = 1) }
                        )
                    }
                }
            }
        ) { padding ->
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 18.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("StudyGuru", color = Coral, fontSize = 26.sp, fontWeight = FontWeight.Bold)
                        Text(if (hindi) "आपकी पढ़ाई, आपकी सफलता" else "Your learning, your success", color = Ink, fontSize = 13.sp)
                    }
                    TextButton(onClick = { hindi = !hindi }) {
                        Text(if (hindi) "हिंदी" else "English", color = Coral)
                    }
                }

                if (loading) {
                    CircularProgressIndicator(color = Coral)
                }

                if (message.isNotBlank()) {
                    Text(message, color = Color(0xFFB3261E), fontSize = 12.sp)
                }

                when (tab) {
                    0 -> {
                        Text(if (hindi) "आज क्या पढ़ना चाहेंगे?" else "What would you like to study?", color = Ink, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                        SummaryCard(if (hindi) "कोर्स" else "Courses", courses.size.toString())
                        SummaryCard(if (hindi) "प्रैक्टिस टेस्ट" else "Practice tests", tests.size.toString())
                        SummaryCard(if (hindi) "लाइव क्लासेस" else "Live classes", liveClasses.size.toString())
                        SummaryCard(if (hindi) "मेरे नोट्स" else "My notes", notes.size.toString())
                        OutlinedButton(onClick = { refreshData() }) { Text(if (hindi) "डेटा रीफ्रेश करें" else "Refresh data") }
                    }
                    1 -> DataList(if (hindi) "कोर्स" else "Courses", courses.map { "${it.title} • ${it.className} • ${it.subject}" }, hindi)
                    2 -> DataList(if (hindi) "स्टडी मटेरियल" else "Study materials", materials.map { "${it.title} • ${it.materialType.uppercase()}" }, hindi)
                    3 -> DataList(if (hindi) "प्रैक्टिस टेस्ट" else "Practice tests", tests.map { "${it.title} • ${it.subject} • ${it.durationMinutes} min" }, hindi)
                    4 -> DataList(if (hindi) "लाइव क्लासेस" else "Live classes", liveClasses.map { "${it.title} • ${it.instructorName ?: it.subject} • ${it.startsAt}" }, hindi)
                    5 -> {
                        if (!signedIn) {
                            Text(if (hindi) "अपने नोट्स देखने के लिए लॉगिन करें।" else "Sign in to view your notes.")
                        } else {
                            DataList(if (hindi) "मेरे नोट्स" else "My Notes", notes.map { "${it.title} • ${it.subject ?: ""}" }, hindi)
                        }
                    }
                    else -> {
                        Text(if (hindi) "अकाउंट और प्रोफाइल" else "Account and profile", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Ink)
                        if (signedIn) {
                            Text(profile?.fullName ?: "Signed in", color = Ink)
                            Text("Role: ${profile?.role ?: "student"}", color = Ink)
                            Text(if (hindi) "टेस्ट प्रयास: ${attempts.size}" else "Test attempts: ${attempts.size}", color = Ink)
                            if (profile?.role == "admin") {
                                SummaryCard(if (hindi) "एडमिन पैनल" else "Admin panel", if (hindi) "एडमिन अकाउंट सक्रिय" else "Admin account active")
                            } else if (profile?.role == "teacher") {
                                SummaryCard(if (hindi) "टीचर डैशबोर्ड" else "Teacher dashboard", if (hindi) "टीचर अकाउंट सक्रिय" else "Teacher account active")
                            }
                            OutlinedButton(onClick = {
                                scope.launch {
                                    runCatching { supabase.gotrue.logout() }
                                    signedIn = false
                                    profile = null
                                    notes = emptyList()
                                    attempts = emptyList()
                                    message = if (hindi) "लॉगआउट हो गया।" else "Signed out."
                                }
                            }) { Text(if (hindi) "लॉगआउट" else "Sign out") }
                        } else {
                            OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
                            OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text(if (hindi) "पासवर्ड" else "Password") }, modifier = Modifier.fillMaxWidth())
                            Button(onClick = {
                                scope.launch {
                                    loading = true
                                    message = ""
                                    runCatching {
                                        supabase.gotrue.loginWith(Email) {
                                            this.email = email.trim()
                                            this.password = password
                                        }
                                    }.onSuccess {
                                        signedIn = true
                                        message = if (hindi) "लॉगिन सफल।" else "Signed in."
                                        refreshData()
                                    }.onFailure {
                                        message = it.message ?: "Sign in failed."
                                    }
                                    loading = false
                                }
                            }, enabled = email.isNotBlank() && password.isNotBlank()) {
                                Text(if (hindi) "ईमेल से लॉगिन" else "Sign in with email")
                            }
                            Button(onClick = {
                                scope.launch {
                                    loading = true
                                    runCatching { supabase.gotrue.loginWith(Google) }
                                        .onFailure { message = it.message ?: "Google sign-in could not start." }
                                    loading = false
                                }
                            }) { Text(if (hindi) "Google से लॉगिन" else "Continue with Google") }
                        }
                        if (profile?.role == "parent") {
                            Text(if (hindi) "Parent dashboard" else "Parent dashboard")
                        } else if (hindi) {
                            Text("Parent अकाउंट के लिए सुरक्षित Parent–Student linking अभी बैकएंड में जोड़ना बाकी है।", fontSize = 12.sp, color = Color(0xFF666666))
                        }
                    }
                }
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun SummaryCard(title: String, value: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Paper),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(title, color = Ink, fontWeight = FontWeight.Medium)
            Text(value, color = Coral, fontWeight = FontWeight.Bold, fontSize = 20.sp)
        }
    }
}

@androidx.compose.runtime.Composable
private fun DataList(title: String, rows: List<String>, hindi: Boolean) {
    Text(title, color = Ink, fontSize = 20.sp, fontWeight = FontWeight.Bold)
    if (rows.isEmpty()) {
        Text(if (hindi) "अभी कोई प्रकाशित सामग्री उपलब्ध नहीं है।" else "No published items available yet.", color = Color(0xFF666666))
    } else {
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(rows) { row ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Paper),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(row, modifier = Modifier.padding(16.dp), color = Ink)
                }
            }
        }
    }
}
