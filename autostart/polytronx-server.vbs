' PolytronX app server (http://localhost:4321), started hidden by the scheduled task
' "PolytronX local server" at logon. This script keeps it alive: whatever makes the server
' process exit, it is relaunched after 15 s, forever. Output lands in logs\server.log
' (deleted and recreated once it passes 5 MB).
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = "C:\Users\Dr Faisal Maqsood PC\Desktop\Radiology Reporting Software Astro"
sh.CurrentDirectory = root
If Not fso.FolderExists(root & "\logs") Then fso.CreateFolder root & "\logs"
logFile = root & "\logs\server.log"
If fso.FileExists(logFile) Then
  If fso.GetFile(logFile).Size > 5242880 Then fso.DeleteFile logFile
End If
sh.Environment("PROCESS")("HOST") = "127.0.0.1"
sh.Environment("PROCESS")("PORT") = "4321"
sh.Environment("PROCESS")("TZ") = "Asia/Karachi"
Do While True
  sh.Run "cmd /c """"C:\Program Files\nodejs\node.exe"" dist\server\entry.mjs >> logs\server.log 2>&1""", 0, True
  WScript.Sleep 15000
Loop
