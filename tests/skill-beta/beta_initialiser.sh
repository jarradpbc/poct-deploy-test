#!/bin/bash

tester_email=$1
feedback_email=$2

echo "######### Creating Beta #########"

if ERROR=$(ask smapi create-beta-test --skill-id ${SKILL_ID} 2>&1 >/dev/null); then
    echo "Create beta command succeeded"
else
    echo "Create beta command failed, error message is:"
    error_message=${ERROR:9}
    echo "$error_message" | jq '.detail.response.message'
fi

if [[ ${feedback_email} != *"none"* ]]
then
  echo "######### Adding Feedback Email #########"
  if ask smapi update-beta-test --skill-id ${SKILL_ID} --feedback-email ${feedback_email} 2>&1 >/dev/null ; then
    echo "Add feedback email command succeeded"
  else
    echo "Add feedback email command failed"
  fi
else
    echo "No feedback email passed"
fi

echo "######### Starting Beta #########"

if ERROR=$(ask smapi start-beta-test --skill-id ${SKILL_ID} 2>&1 >/dev/null); then
  echo "Start beta command succeeded"
else
  echo "Start beta command failed, error message is:"
  error_message=${ERROR:9}
  echo "$error_message" | jq '.detail.response.message'
fi

echo "######### Inviting Tester #########"

if ERROR=$(ask smapi add-testers-to-beta-test --skill-id ${SKILL_ID} --testers-emails ${tester_email} 2>&1 >/dev/null); then
  echo "Invite tester command succeeded"
else
  echo "Invite tester command failed, email may already be invited"
fi