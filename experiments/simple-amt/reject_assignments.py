import argparse, json
import csv
import simpleamt

if __name__ == '__main__':
  parser = argparse.ArgumentParser(add_help=False)
  parser.add_argument('-P', '--prod', action='store_false', dest='sandbox',
                      default=True,
                      help="Whether to run on the production AMT site.")
  parser.add_argument('-a', '--assignment_ids_file')
  parser.add_argument('-c', '--config', default='config.json', type=simpleamt.json_file)
  args = parser.parse_args()
  mtc = simpleamt.get_mturk_connection_from_args(args)

  if args.assignment_ids_file is None:
    parser.error('Must specify --assignment_ids_file.')

  with open(args.assignment_ids_file, 'r') as f:
      reader = csv.reader(f)
      assignment_ids = list(reader)

  print(('This will reject %d assignments with '
         'sandbox=%s' % (len(assignment_ids), str(args.sandbox))))
  print('Continue?')

  s = input('(Y/N): ')
  if s == 'Y' or s == 'y':
    print('Rejecting assignments')
    for idx, (assignment_id, reason) in enumerate(assignment_ids):
      print('Rejecting assignment %d / %d' % (idx + 1, len(assignment_ids)))
      try:
        mtc.reject_assignment(assignment_id, feedback=reason)
      except:
        print("Could not reject: %s" % (assignment_id))
  else:
    print('Aborting')
