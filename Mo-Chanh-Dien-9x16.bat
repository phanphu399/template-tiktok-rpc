@echo off
title Mo Man Hinh Chanh Dien 9:16 Cho TikTok Live Studio
echo Dang khoi dong man hinh Chanh Dien 9:16 (Tu dong mo am thanh)...
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:3000/?obs=1" --window-size=540,960 --autoplay-policy=no-user-gesture-required --disable-features=PreloadMediaEngagementData,AutoplayIgnoreWebAudio
if %ERRORLEVEL% NEQ 0 (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="http://localhost:3000/?obs=1" --window-size=540,960 --autoplay-policy=no-user-gesture-required --disable-features=PreloadMediaEngagementData,AutoplayIgnoreWebAudio
)
echo Da mo xong! Ban hay vao TikTok Live Studio chon nguon "Cua so (Window)" de quay man hinh nay.
