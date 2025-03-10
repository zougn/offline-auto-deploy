#!/bin/bash
find /app/maven/localRepository -name "*.lastUpdated" -exec grep -q "Could not transfer" {} ; -print -exec rm {} ;
