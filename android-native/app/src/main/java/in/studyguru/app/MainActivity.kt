package in.studyguru.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Coral = Color(0xFFFF6148)
private val Ink = Color(0xFF1F2633)
private val Paper = Color(0xFFFFFFFF)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { StudyGuruApp() }
    }
}

@androidx.compose.runtime.Composable
private fun StudyGuruApp() {
    var hindi by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableIntStateOf(0) }
    val labels = if (hindi) listOf("होम", "कोर्स", "टेस्ट", "प्रोफाइल")
                 else listOf("Home", "Courses", "Tests", "Profile")

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
                    val icons = listOf(Icons.Filled.Home, Icons.Filled.Book, Icons.Filled.Quiz, Icons.Filled.Person)
                    labels.forEachIndexed { index, label ->
                        NavigationBarItem(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            icon = { Icon(icons[index], contentDescription = label) },
                            label = { Text(label) }
                        )
                    }
                }
            }
        ) { padding ->
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("StudyGuru", color = Coral, fontSize = 27.sp, fontWeight = FontWeight.Bold)
                        Text(if (hindi) "आपकी पढ़ाई, आपकी सफलता" else "Your learning, your success", color = Ink)
                    }
                    TextButton(onClick = { hindi = !hindi }) {
                        Text(if (hindi) "हिंदी" else "English", color = Coral)
                    }
                }

                when (selectedTab) {
                    0 -> {
                        Text(if (hindi) "नमस्ते! 👋" else "Welcome!", fontSize = 23.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                        Text(if (hindi) "आज क्या पढ़ना चाहेंगे?" else "What would you like to study today?", color = Ink)
                        DashboardCard(if (hindi) "मेरे कोर्स" else "My Courses", if (hindi) "अपनी कक्षाएँ और अध्याय देखें" else "Explore your classes and chapters")
                        DashboardCard(if (hindi) "प्रैक्टिस टेस्ट" else "Practice Tests", if (hindi) "अपनी तैयारी जाँचें" else "Check your preparation")
                        DashboardCard(if (hindi) "लाइव क्लासेस" else "Live Classes", if (hindi) "अपनी लाइव कक्षाएँ देखें" else "Join your live learning sessions")
                    }
                    1 -> DashboardCard(if (hindi) "कोर्स" else "Courses", if (hindi) "कोर्स की सूची बैकएंड कनेक्शन के बाद यहाँ दिखेगी।" else "Your course list will appear here after backend integration.")
                    2 -> DashboardCard(if (hindi) "टेस्ट" else "Tests", if (hindi) "प्रैक्टिस टेस्ट और परिणाम यहाँ उपलब्ध होंगे।" else "Practice tests and results will appear here.")
                    else -> DashboardCard(if (hindi) "प्रोफाइल" else "Profile", if (hindi) "लॉगिन और भूमिका-आधारित प्रोफाइल अगले चरण में जोड़े जाएँगे।" else "Sign-in and role-based profiles will be added in the next stage.")
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    if (hindi) "यह शुरुआती Native UI है — अभी लॉगिन या डेटा सिंक सक्रिय नहीं है।"
                    else "This is the initial native UI — sign-in and data sync are not active yet.",
                    color = Color(0xFF666666),
                    fontSize = 12.sp
                )
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun DashboardCard(title: String, description: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Paper),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(Modifier.padding(18.dp)) {
            Text(title, color = Ink, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Spacer(Modifier.height(6.dp))
            Text(description, color = Color(0xFF606775), fontSize = 14.sp)
        }
    }
}
