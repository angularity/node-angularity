#!/bin/bash

#usage ./doc.sh &> cli-usage.md

echo "# angularity"
echo
angularity -h
echo
for subtask in  build css html init javascript release server test watch webstorm ; do
  echo "## angularity ${subtask}"
  echo
  angularity ${subtask} -h
  echo
done
