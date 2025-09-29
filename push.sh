#!/bin/bash
unset HISTFILE
read -s -p "Paste your GitHub token: " GHTOKEN; echo
git -c http.extraheader="Authorization: Bearer ${GHTOKEN}" push -u origin main
unset GHTOKEN
