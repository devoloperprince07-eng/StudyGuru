package `in`.studyguru.app

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.rpc
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.storage.storage
import io.github.jan.supabase.storage.from
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlin.time.Duration.Companion.minutes

@Serializable private data class NoteCreate(@SerialName("user_id") val userId: String, val title: String, val body: String, val subject: String? = null)
@Serializable private data class QuestionItem(val id: String, @SerialName("test_id") val testId: String, @SerialName("question_text") val questionText: String, val options: List<String>)
@Serializable private data class TestSubmit(@SerialName("p_test_id") val testId: String, @SerialName("p_answers") val answers: JsonObject)
@Serializable private data class TestScore(@SerialName("attempt_id") val attemptId: String, val score: Int, val total: Int)
@Serializable private data class CourseDraft(val title: String, @SerialName("class_name") val className: String, val subject: String, val description: String = "", @SerialName("created_by") val createdBy: String, @SerialName("is_published") val isPublished: Boolean = false)
@Serializable private data class TestDraft(val title: String, @SerialName("class_name") val className: String, val subject: String, val description: String = "", @SerialName("created_by") val createdBy: String, @SerialName("duration_minutes") val durationMinutes: Int = 15, @SerialName("is_published") val isPublished: Boolean = false)

@Composable
internal fun MaterialsScreen(items: List<MaterialRow>, hindi: Boolean, onOpen: (String) -> Unit, onMessage: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var busy by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(if (hindi) "स्टडी मटेरियल" else "Study materials", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        if (items.isEmpty()) Text(if (hindi) "अभी कोई प्रकाशित सामग्री उपलब्ध नहीं है।" else "No published materials yet.", color = Color.Gray)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(items) { item ->
                Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp)) {
                    Text(item.title, fontWeight = FontWeight.SemiBold)
                    Text(item.description ?: item.materialType.uppercase(), color = Color.Gray)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(enabled = !busy, onClick = {
                            scope.launch {
                                busy = true
                                runCatching {
                                    item.externalUrl?.takeIf { it.isNotBlank() }
                                        ?: supabase.storage[item.storageBucket].createSignedUrl(item.storagePath, 15.minutes)
                                }.onSuccess(onOpen).onFailure { onMessage(it.message ?: "सामग्री नहीं खुल सकी।") }
                                busy = false
                            }
                        }) { Text(if (hindi) "खोलें" else "Open") }
                        OutlinedButton(enabled = !busy, onClick = {
                            scope.launch {
                                busy = true
                                runCatching {
                                    item.externalUrl?.takeIf { it.isNotBlank() }
                                        ?: supabase.storage[item.storageBucket].createSignedUrl(item.storagePath, 15.minutes)
                                }.onSuccess { url ->
                                    runCatching {
                                        val filename = item.title.replace(Regex("[^A-Za-z0-9._-]"), "_").take(60) +
                                            if (item.materialType == "pdf") ".pdf" else ".mp4"
                                        val request = DownloadManager.Request(Uri.parse(url))
                                            .setTitle(item.title)
                                            .setDescription("StudyGuru offline study download")
                                            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                                            .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename)
                                        (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
                                    }.onSuccess { onMessage("डाउनलोड शुरू हुआ। पूरा होने पर फ़ाइल Downloads फ़ोल्डर में मिलेगी।") }
                                        .onFailure { onMessage(it.message ?: "डाउनलोड शुरू नहीं हो सका।") }
                                }.onFailure { onMessage(it.message ?: "फ़ाइल URL नहीं मिला।") }
                                busy = false
                            }
                        }) { Text(if (hindi) "ऑफलाइन डाउनलोड" else "Download") }
                    }
                } }
            }
        }
    }
}

@Composable
internal fun NotesScreen(signedIn: Boolean, notes: List<NoteRow>, hindi: Boolean, onRefresh: () -> Unit, onMessage: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var subject by remember { mutableStateOf("") }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(if (hindi) "मेरे नोट्स" else "My notes", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        if (!signedIn) Text(if (hindi) "नोट्स बनाने के लिए लॉगिन करें।" else "Sign in to create notes.")
        else {
            OutlinedTextField(title, { title = it }, label = { Text(if (hindi) "नोट का शीर्षक" else "Note title") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(subject, { subject = it }, label = { Text(if (hindi) "विषय (वैकल्पिक)" else "Subject (optional)") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(body, { body = it }, label = { Text(if (hindi) "नोट लिखें" else "Write note") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
            Button(enabled = title.isNotBlank() && body.isNotBlank(), onClick = {
                scope.launch {
                    val uid = supabase.auth.currentUserOrNull()?.id
                    if (uid == null) { onMessage("कृपया दोबारा लॉगिन करें।"); return@launch }
                    runCatching { supabase.from("student_notes").insert(NoteCreate(uid, title.trim(), body.trim(), subject.trim().ifBlank { null })) }
                        .onSuccess { title = ""; body = ""; subject = ""; onMessage("नोट सेव हो गया।"); onRefresh() }
                        .onFailure { onMessage(it.message ?: "नोट सेव नहीं हुआ।") }
                }
            }) { Text(if (hindi) "नोट सेव करें" else "Save note") }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(notes) { note ->
                    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) {
                        Text(note.title, fontWeight = FontWeight.Bold)
                        Text(note.body)
                        if (!note.subject.isNullOrBlank()) Text(note.subject, color = Color.Gray)
                        TextButton(onClick = {
                            scope.launch {
                                runCatching { supabase.from("student_notes").delete { filter { eq("id", note.id) } } }
                                    .onSuccess { onMessage("नोट हटाया गया।"); onRefresh() }
                                    .onFailure { onMessage(it.message ?: "नोट नहीं हट सका।") }
                            }
                        }) { Text(if (hindi) "नोट हटाएँ" else "Delete note", color = Color(0xFFB3261E)) }
                    } }
                }
            }
        }
    }
}

@Composable
internal fun TestsScreen(tests: List<TestRow>, signedIn: Boolean, hindi: Boolean, onRefresh: () -> Unit, onMessage: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var active by remember { mutableStateOf<TestRow?>(null) }
    var questions by remember { mutableStateOf(emptyList<QuestionItem>()) }
    var answers by remember { mutableStateOf<Map<String, Int>>(emptyMap()) }
    var busy by remember { mutableStateOf(false) }
    var scoreText by remember { mutableStateOf("") }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            if (active != null) TextButton(onClick = { active = null; questions = emptyList(); answers = emptyMap(); scoreText = "" }) { Text("← Back") }
            Text(if (active == null) (if (hindi) "प्रैक्टिस टेस्ट" else "Practice tests") else active!!.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }
        if (active == null) {
            if (tests.isEmpty()) Text(if (hindi) "अभी कोई प्रकाशित टेस्ट नहीं है।" else "No published tests yet.", color = Color.Gray)
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(tests) { test -> Card(Modifier.fillMaxWidth()) { Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(Modifier.weight(1f)) { Text(test.title, fontWeight = FontWeight.SemiBold); Text("${test.subject} • ${test.durationMinutes} min", color = Color.Gray) }
                    Button(enabled = !busy, onClick = {
                        scope.launch {
                            busy = true; answers = emptyMap(); scoreText = ""
                            runCatching {
                                supabase.from("test_questions").select().decodeList<QuestionItem>().also { list ->
                                    questions = list.filter { it.testId == test.id }
                                }
                            }.onSuccess { active = test }.onFailure { onMessage(it.message ?: "प्रश्न लोड नहीं हुए।") }
                            busy = false
                        }
                    }) { Text(if (hindi) "शुरू करें" else "Start") }
                } } }
            }
        } else {
            if (!signedIn) Text(if (hindi) "टेस्ट जमा करने के लिए लॉगिन करें।" else "Sign in to submit this test.")
            if (scoreText.isNotBlank()) Text(scoreText, color = Color(0xFF16803C), fontWeight = FontWeight.Bold)
            if (questions.isEmpty()) Text(if (hindi) "इस टेस्ट में अभी प्रश्न नहीं जोड़े गए हैं।" else "No questions have been added to this test yet.", color = Color.Gray)
            LazyColumn(Modifier.weight(1f, fill = false), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(questions) { q -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) {
                    Text(q.questionText, fontWeight = FontWeight.SemiBold)
                    q.options.forEachIndexed { i, option ->
                        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                            RadioButton(selected = answers[q.id] == i, onClick = { answers = answers + (q.id to i) })
                            Text(option)
                        }
                    }
                } } }
            }
            Button(enabled = signedIn && questions.isNotEmpty() && answers.size == questions.size && !busy, onClick = {
                scope.launch {
                    busy = true
                    runCatching {
                        val json = buildJsonObject { answers.forEach { (id, index) -> put(id, JsonPrimitive(index)) } }
                        supabase.postgrest.rpc("submit_studyguru_test", TestSubmit(active!!.id, json)).decodeAs<TestScore>()
                    }.onSuccess { result ->
                        scoreText = "आपका स्कोर: ${result.score} / ${result.total}"
                        onRefresh()
                    }.onFailure { onMessage(it.message ?: "टेस्ट जमा नहीं हुआ।") }
                    busy = false
                }
            }) { Text(if (hindi) "टेस्ट जमा करें" else "Submit test") }
        }
    }
}

@Composable
internal fun AdminToolsScreen(hindi: Boolean, onMessage: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var courseTitle by remember { mutableStateOf("") }
    var courseClass by remember { mutableStateOf("Class 10") }
    var courseSubject by remember { mutableStateOf("") }
    var testTitle by remember { mutableStateOf("") }
    var testClass by remember { mutableStateOf("Class 10") }
    var testSubject by remember { mutableStateOf("") }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(if (hindi) "टीचर / एडमिन कंटेंट टूल्स" else "Teacher / Admin content tools", style = MaterialTheme.typography.titleMedium, color = Color(0xFFFF6148), fontWeight = FontWeight.Bold)
        OutlinedTextField(courseTitle, { courseTitle = it }, label = { Text("Course title") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(courseClass, { courseClass = it }, label = { Text("Class") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(courseSubject, { courseSubject = it }, label = { Text("Subject") }, modifier = Modifier.fillMaxWidth())
        Button(enabled = courseTitle.isNotBlank() && courseSubject.isNotBlank(), onClick = {
            scope.launch {
                val uid = supabase.auth.currentUserOrNull()?.id ?: return@launch
                runCatching { supabase.from("courses").insert(CourseDraft(courseTitle.trim(), courseClass.trim(), courseSubject.trim(), createdBy = uid)) }
                    .onSuccess { courseTitle = ""; courseSubject = ""; onMessage("कोर्स Draft सेव हुआ।") }
                    .onFailure { onMessage(it.message ?: "कोर्स सेव नहीं हुआ।") }
            }
        }) { Text("Create course draft") }
        Divider()
        OutlinedTextField(testTitle, { testTitle = it }, label = { Text("Test title") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(testClass, { testClass = it }, label = { Text("Class") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(testSubject, { testSubject = it }, label = { Text("Subject") }, modifier = Modifier.fillMaxWidth())
        Button(enabled = testTitle.isNotBlank() && testSubject.isNotBlank(), onClick = {
            scope.launch {
                val uid = supabase.auth.currentUserOrNull()?.id ?: return@launch
                runCatching { supabase.from("practice_tests").insert(TestDraft(testTitle.trim(), testClass.trim(), testSubject.trim(), createdBy = uid)) }
                    .onSuccess { testTitle = ""; testSubject = ""; onMessage("Test Draft सेव हुआ।") }
                    .onFailure { onMessage(it.message ?: "Test सेव नहीं हुआ।") }
            }
        }) { Text("Create test draft") }
        Text("यहाँ केवल Draft बनते हैं। प्रश्न जोड़ना, PDF/Video upload और Publish workflow अभी शेष हैं।", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
    }
}
