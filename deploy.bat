@echo off
echo 正在部署UNO游戏到本地...
cd %~dp0
mkdir ..\UnoGameDeploy
xcopy /E /Y dist\* ..\UnoGameDeploy\
echo 部署完成！游戏文件已复制到 ..\UnoGameDeploy 文件夹
echo 您可以将此文件夹分享给其他用户