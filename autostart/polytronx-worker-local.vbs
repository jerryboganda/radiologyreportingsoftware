' PolytronX AI worker for the local app, started hidden by the scheduled task
' "PolytronX local AI worker" at logon. Keeps it alive: a crashed worker (nonzero exit) is
' relaunched after 15 s, forever. A worker that exits 0 within 15 s of starting has found
' .worker\worker.lock held by another instance - it stops watching so the other copy serves.
' Output lands in logs\worker-local.log (deleted and recreated once it passes 5 MB).
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = "C:\Users\Dr Faisal Maqsood PC\Desktop\Radiology Reporting Software Astro"
sh.CurrentDirectory = root
If Not fso.FolderExists(root & "\logs") Then fso.CreateFolder root & "\logs"
logFile = root & "\logs\worker-local.log"
If fso.FileExists(logFile) Then
  If fso.GetFile(logFile).Size > 5242880 Then fso.DeleteFile logFile
End If
sh.Environment("PROCESS")("TZ") = "Asia/Karachi"
' 127.0.0.1, not localhost: another project's dev server can squat [::1]:4321 and catch the worker's posts.
sh.Environment("PROCESS")("APP_URL") = "http://127.0.0.1:4321"
Do While True
  started = Timer
  code = sh.Run("cmd /c """"C:\Program Files\nodejs\node.exe"" scripts\queue_worker.mjs >> logs\worker-local.log 2>&1""", 0, True)
  If code = 0 And Timer - started < 15 Then WScript.Quit 0
  WScript.Sleep 15000
Loop
