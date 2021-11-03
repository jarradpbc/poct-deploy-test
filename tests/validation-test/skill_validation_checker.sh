#!/bin/bash
skill_id=$1

echo "######### Checking validations #########"

folder="../../alexa-skill/skill-package/interactionModels/custom/*"

for d in ${folder}; do

    file_name="${d##*/}"
    locale="${file_name%.*}"

    echo "Checking validations for locale: ${locale}"
    echo "###############################"

    validations=$(ask smapi submit-skill-validation -s ${skill_id} -l ${locale} -g development)

    id=$(jq ".id" <<< ${validations})
    #Remove quotes
    id=$(echo "${id}" | sed 's/"//g')
    echo "Id of validation: ${id}"
    status="IN_PROGRESS"

    while [[ ${status} == *"IN_PROGRESS"* ]]; do

        status_raw=$(ask smapi get-skill-validations --validation-id ${id} -s ${skill_id} -g development)

        status=$(jq ".status" <<< ${status_raw})
        echo "Current status: ${status}"
        
        if [[ ${status} == *"IN_PROGRESS"* ]]
        then
            echo "Waiting for finishing the validation..."
            sleep 15
        fi

    done

    if [[ ${status} == *"SUCCESSFUL"* ]]
    then
        echo "Validation pass"
        exit 0
    else
        echo "Validation errors: ${status_raw}"
        exit 1
    fi

done