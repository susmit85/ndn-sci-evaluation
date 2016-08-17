
ARG=$1

for ((i=1; i<=10; i++)); do
    echo $ARG
    /usr/local/bin/cxx-producer -c /catalog -f $ARG -n /cmip5/output/lbl -i /cmip5/lbl/DataPublisher
    sleep 25
    
    echo d-$ARG
    /usr/local/bin/cxx-producer -c /catalog -f d-$ARG -n /cmip5/output/lbl -i /cmip5/lbl/DataPublisher
    sleep 25
done

