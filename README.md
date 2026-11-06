# WeKan ®

This uses Gambas for WebUI app with SQLite database.

Current prototype has login, some menus, but not other functionality yet.

## About WeKan ® for Gambas

[WeKan ® for Gambas at WeKan Roadmap](https://boards.wekan.team/b/D2SzJKZDS4Z48yeQH/wekan-r-open-source-kanban-board-with-mit-license/S6jegFB3CWoBJieqS)

[WeKan ® for Gambas Bugs and Feature Requests](https://github.com/wekan/hx/issues)

[WeKan ® for Gambas Pull Requests](https://github.com/wekan/hx/pulls)

Developed by [WeKan ® Team](https://wekan.team) using Gambas Daily builds on newest [Linux Mint](https://linuxmint.com) Mate 64bit.

## About Gambas

Gambas has IDE similar to VB6. Gambas can create GUI, WebUI and CLI apps.

[Gambas website](http://gambas.sourceforge.net)

[Daily PPA](https://launchpad.net/~gambas-team/+archive/ubuntu/gambas-daily)

[Stable PPA](https://launchpad.net/~gambas-team/+archive/ubuntu/gambas3)

[Gambas source code](https://gitlab.com/gambas/gambas)

[Gambas bugtracker](https://gambaswiki.org/bugtracker)

Note: Gambas seems to have very advanced RAD GUI Menu editor. It is possible to multi-select many
menu items at once and move them right to be submenu, or move to left.

## Install on Windows

1) At Win11 WSL2 now supports installing GUI apps:

https://docs.microsoft.com/en-us/windows/wsl/tutorials/gui-apps

2) Install Gambas daily PPA by adding it from:

https://launchpad.net/~gambas-team/+archive/ubuntu/gambas-daily

3) Install Gambas with:

```
sudo apt install gambas3
```

4) Start with:

```
gambas3
```

5) And it opens Gambas GUI.

6) Related: SystemD on WSL2

https://devblogs.microsoft.com/commandline/systemd-support-is-now-available-in-wsl/

## Install on Linux

1. Run `./install-deps.sh`
2. In Gambas, click Open Project, and select directory WeKan.
3. Click play button that looks like triangle to right. This starts webserver and opens webbrowser.
4. Login with:

```
Username: demo
Password: demo
```
