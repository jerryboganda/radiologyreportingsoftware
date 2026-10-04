' PolytronX AI worker for production (https://radiology.polytronx.com), started hidden by the
' scheduled task "PolytronX production AI worker" at logon. The APP_URL and the password come
' from the git-ignored start-worker-production.cmd, so the secret exists in exactly one file.
' Keeps it alive: a crashed worker (nonzero exit) is relaunched after 15 s, forever. A worker
' that exits 0 within 15 s of starting has found .worker-prod\worker.lock held by another
' instance - it stops watching so the other copy serves.
' Output lands in logs\worker-production.log (deleted and recreated once it passes 5 MB).
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = "C:\Users\Dr Faisal Maqsood PC\Desktop\Radiology Reporting Software Astro"
sh.CurrentDirectory = root
If Not fso.FolderExists(root & "\logs") Then fso.CreateFolder root & "\logs"
logFile = root & "\logs\worker-production.log"
If fso.FileExists(logFile) Then
  If fso.GetFile(logFile).Size > 5242880 Then fso.DeleteFile logFile
End If
sh.Environment("PROCESS")("TZ") = "Asia/Karachi"
Do While True
  started = Timer
  code = sh.Run("cmd /c ""start-worker-production.cmd >> logs\worker-production.log 2>&1""", 0, True)
  If code = 0 And Timer - started < 15 Then WScript.Quit 0
  WScript.Sleep 15000
Loop
